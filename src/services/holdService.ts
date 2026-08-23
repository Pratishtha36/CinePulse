import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { emitSeatStatusUpdate } from '../sockets/socketManager';

export const holdSeats = async (customerId: string, showId: string, showSeatIds: string[]) => {
  if (!showSeatIds || showSeatIds.length === 0) {
    throw { statusCode: 400, message: 'At least one seat must be selected to hold' };
  }

  if (showSeatIds.length > ENV.MAX_SEATS_PER_HOLD) {
    throw {
      statusCode: 400,
      message: `Cannot hold more than ${ENV.MAX_SEATS_PER_HOLD} seats in a single request`,
    };
  }

  const ttlMinutes = ENV.SEAT_HOLD_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // Execute in isolated database transaction for concurrency protection
  const result = await prisma.$transaction(
    async (tx) => {
      const now = new Date();


    // 1. Fetch requested showSeats with their current holds and active waitlist offers
    const showSeats = await tx.showSeat.findMany({
      where: {
        id: { in: showSeatIds },
        showId: showId,
      },
      include: {
        seat: true,
        hold: true,
        waitlistOffers: {
          where: { status: 'PENDING' },
          include: { waitlistEntry: true },
        },
      },
    });

    if (showSeats.length !== showSeatIds.length) {
      throw { statusCode: 404, message: 'One or more invalid seat IDs for this show' };
    }

    // 2. Evaluate availability, automatically releasing any staled/expired holds
    for (const ss of showSeats) {
      if (ss.status === 'BOOKED') {
        throw {
          statusCode: 409,
          message: `Seat ${ss.seat.rowLabel}${ss.seat.colNumber} is already booked`,
        };
      }

      if (ss.status === 'HELD') {
        if (ss.hold) {
          if (ss.hold.expiresAt <= now || ss.hold.status !== 'ACTIVE') {
            // Expired hold - auto cleanup
            await tx.seatHold.delete({ where: { id: ss.hold.id } });
          } else if (ss.hold.customerId !== customerId) {
            // Active hold by someone else!
            throw {
              statusCode: 409,
              message: `Seat ${ss.seat.rowLabel}${ss.seat.colNumber} is currently held by another user`,
            };
          } else {
            // Held by the SAME customer - refresh hold expiry
            await tx.seatHold.delete({ where: { id: ss.hold.id } });
          }
        } else if (ss.waitlistOffers && ss.waitlistOffers.length > 0) {
          const pendingOffer = ss.waitlistOffers[0];
          if (pendingOffer.offerExpiresAt <= now) {
            // Expired offer - mark expired
            await tx.waitlistOffer.update({
              where: { id: pendingOffer.id },
              data: { status: 'EXPIRED' },
            });
            await tx.waitlistEntry.update({
              where: { id: pendingOffer.waitlistEntryId },
              data: { status: 'EXPIRED' },
            });
          } else if (pendingOffer.waitlistEntry.customerId !== customerId) {
            throw {
              statusCode: 409,
              message: `Seat ${ss.seat.rowLabel}${ss.seat.colNumber} is currently reserved for a waitlist offer`,
            };
          }
        } else {
          // In case status is HELD without active hold or offer, reset to available
          await tx.showSeat.update({
            where: { id: ss.id },
            data: { status: 'AVAILABLE' },
          });
        }
      }
    }

    // 3. Mark seats as HELD & create hold records
    const createdHolds = [];
    for (const ss of showSeats) {
      await tx.showSeat.update({
        where: { id: ss.id },
        data: {
          status: 'HELD',
          version: { increment: 1 },
        },
      });

      const hold = await tx.seatHold.create({
        data: {
          showSeatId: ss.id,
          showId: showId,
          customerId: customerId,
          expiresAt,
          status: 'ACTIVE',
        },
      });
      createdHolds.push(hold);
    }

    return { showSeats, createdHolds, expiresAt };
    },
    { maxWait: 15000, timeout: 20000 }
  );


  // Broadcast real-time Socket.io update
  emitSeatStatusUpdate(showId, 'held', {
    showSeatIds,
    heldBy: customerId,
    expiresAt,
  });

  return {
    message: `Successfully held ${showSeatIds.length} seat(s)`,
    expiresAt: result.expiresAt,
    holdIds: result.createdHolds.map((h) => h.id),
  };
};


export const releaseHold = async (customerId: string, showSeatIds: string[]) => {
  const released = await prisma.$transaction(async (tx) => {
    const holds = await tx.seatHold.findMany({
      where: {
        showSeatId: { in: showSeatIds },
        customerId: customerId,
        status: 'ACTIVE',
      },
      include: { showSeat: true },
    });

    if (holds.length === 0) return { count: 0, showId: null };

    const showId = holds[0].showId;

    for (const hold of holds) {
      await tx.seatHold.delete({ where: { id: hold.id } });
      await tx.showSeat.update({
        where: { id: hold.showSeatId },
        data: { status: 'AVAILABLE' },
      });
    }

    return { count: holds.length, showId };
  });

  if (released.showId) {
    emitSeatStatusUpdate(released.showId, 'released', {
      showSeatIds,
    });
  }

  return { releasedCount: released.count };
};

// Auto-cleaner called by periodic scheduler
export const autoReleaseExpiredHolds = async () => {
  const now = new Date();

  const expiredHolds = await prisma.seatHold.findMany({
    where: {
      expiresAt: { lte: now },
      status: 'ACTIVE',
    },
    include: { showSeat: true },
  });

  if (expiredHolds.length === 0) return 0;

  for (const hold of expiredHolds) {
    await prisma.$transaction(async (tx) => {
      await tx.seatHold.delete({ where: { id: hold.id } }).catch(() => {});
      await tx.showSeat.update({
        where: { id: hold.showSeatId },
        data: { status: 'AVAILABLE' },
      });
    });

    emitSeatStatusUpdate(hold.showId, 'released', {
      showSeatIds: [hold.showSeatId],
      reason: 'TTL_EXPIRED',
    });
  }

  return expiredHolds.length;
};
