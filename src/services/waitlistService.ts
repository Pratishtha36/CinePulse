import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { sendWaitlistOfferEmail } from './emailService';
import { emitSeatStatusUpdate } from '../sockets/socketManager';

export const joinWaitlist = async (customerId: string, showId: string, seatCategory: string) => {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    include: { event: true, venue: true },
  });
  if (!show) throw { statusCode: 404, message: 'Show not found' };

  // Check if category exists in categoryPrices
  const categoryPrices: Record<string, number> = JSON.parse(show.categoryPrices || '{}');
  if (!(seatCategory in categoryPrices)) {
    throw { statusCode: 400, message: `Invalid seat category '${seatCategory}' for this show` };
  }

  // Requirement: Waitlist is for sold-out categories
  const now = new Date();
  const availableSeatsCount = await prisma.showSeat.count({
    where: {
      showId,
      seat: { category: seatCategory },
      status: 'AVAILABLE',
    },
  });

  if (availableSeatsCount > 0) {
    throw {
      statusCode: 400,
      message: `Seats are currently available in category '${seatCategory}' (${availableSeatsCount} left). You can hold and book directly from the seat map.`,
    };
  }

  // Check if customer already waiting for this show and category
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      showId,
      seatCategory,
      customerId,
      status: 'WAITING',
    },
  });

  if (existing) {
    throw { statusCode: 400, message: 'You are already on the waitlist for this seat category' };
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      showId,
      seatCategory,
      customerId,
      status: 'WAITING',
    },
    include: {
      customer: { select: { name: true, email: true } },
    },
  });

  // Count position in queue
  const queuePosition = await prisma.waitlistEntry.count({
    where: {
      showId,
      seatCategory,
      status: 'WAITING',
      createdAt: { lte: entry.createdAt },
    },
  });

  return {
    message: `Successfully joined waitlist for ${seatCategory}`,
    waitlistId: entry.id,
    queuePosition,
  };
};

export const leaveWaitlist = async (customerId: string, waitlistId: string) => {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistId },
  });

  if (!entry) throw { statusCode: 404, message: 'Waitlist entry not found' };
  if (entry.customerId !== customerId) {
    throw { statusCode: 403, message: 'Not authorized to modify this waitlist entry' };
  }

  if (entry.status !== 'WAITING') {
    throw { statusCode: 400, message: `Cannot cancel waitlist entry with status '${entry.status}'` };
  }

  await prisma.waitlistEntry.update({
    where: { id: waitlistId },
    data: { status: 'CANCELLED' },
  });

  return { message: 'Successfully removed from waitlist.' };
};

export const getWaitlistOfferDetails = async (offerId: string) => {
  const offer = await prisma.waitlistOffer.findUnique({
    where: { id: offerId },
    include: {
      waitlistEntry: { include: { customer: { select: { id: true, name: true, email: true } } } },
      showSeat: {
        include: {
          seat: true,
          show: { include: { event: true, venue: true } },
        },
      },
    },
  });

  if (!offer) throw { statusCode: 404, message: 'Waitlist offer not found' };

  const isExpired = offer.offerExpiresAt <= new Date() || offer.status !== 'PENDING';
  const categoryPrices = JSON.parse(offer.showSeat.show.categoryPrices || '{}');

  return {
    offerId: offer.id,
    status: isExpired && offer.status === 'PENDING' ? 'EXPIRED' : offer.status,
    showId: offer.showSeat.showId,
    showSeatId: offer.showSeatId,
    eventTitle: offer.showSeat.show.event.title,
    venueName: offer.showSeat.show.venue.name,
    showStartTime: offer.showSeat.show.startTime,
    seatLabel: `${offer.showSeat.seat.rowLabel}${offer.showSeat.seat.colNumber}`,
    category: offer.showSeat.seat.category,
    price: categoryPrices[offer.showSeat.seat.category] || 0,
    offerExpiresAt: offer.offerExpiresAt,
    customer: offer.waitlistEntry.customer,
  };
};

export const processCancelledSeatWaitlist = async (showSeatId: string) => {
  const showSeat = await prisma.showSeat.findUnique({
    where: { id: showSeatId },
    include: { seat: true, show: { include: { event: true, venue: true } } },
  });

  if (!showSeat) return;

  const category = showSeat.seat.category;
  const showId = showSeat.showId;

  // Find next customer waiting for this category (FIFO by createdAt)
  const nextWaitlistEntry = await prisma.waitlistEntry.findFirst({
    where: {
      showId,
      seatCategory: category,
      status: 'WAITING',
    },
    orderBy: { createdAt: 'asc' },
    include: { customer: true },
  });

  if (nextWaitlistEntry) {
    const offerTtlMinutes = ENV.WAITLIST_OFFER_TTL_MINUTES;
    const offerExpiresAt = new Date(Date.now() + offerTtlMinutes * 60 * 1000);

    // Reserve seat for waitlisted customer & create offer
    await prisma.$transaction(async (tx) => {
      await tx.showSeat.update({
        where: { id: showSeatId },
        data: { status: 'HELD' },
      });

      await tx.waitlistEntry.update({
        where: { id: nextWaitlistEntry.id },
        data: { status: 'OFFERED' },
      });

      const offer = await tx.waitlistOffer.create({
        data: {
          waitlistEntryId: nextWaitlistEntry.id,
          showSeatId: showSeatId,
          offerExpiresAt,
          status: 'PENDING',
        },
      });

      const claimUrl = `${ENV.CLIENT_URL}/claim/${offer.id}`;

      // Send email notification with claim link
      sendWaitlistOfferEmail({
        toEmail: nextWaitlistEntry.customer.email,
        customerName: nextWaitlistEntry.customer.name,
        eventTitle: showSeat.show.event.title,
        seatCategory: category,
        seatLabel: `${showSeat.seat.rowLabel}${showSeat.seat.colNumber}`,
        offerExpiresAt,
        claimOfferUrl: claimUrl,
      }).catch((err) => console.error('[WAITLIST EMAIL ERROR]:', err));
    });

    emitSeatStatusUpdate(showId, 'held', {
      showSeatIds: [showSeatId],
      reason: 'WAITLIST_OFFER',
      offerExpiresAt,
    });

    console.log(`[WAITLIST] Offer assigned to ${nextWaitlistEntry.customer.email} for seat ${showSeat.seat.rowLabel}${showSeat.seat.colNumber}`);
  } else {
    // No one on waitlist - seat becomes AVAILABLE
    await prisma.showSeat.update({
      where: { id: showSeatId },
      data: { status: 'AVAILABLE' },
    });

    emitSeatStatusUpdate(showId, 'released', {
      showSeatIds: [showSeatId],
      reason: 'CANCELLATION_NO_WAITLIST',
    });
  }
};

export const autoAdvanceExpiredWaitlistOffers = async () => {
  const now = new Date();

  const expiredOffers = await prisma.waitlistOffer.findMany({
    where: {
      offerExpiresAt: { lte: now },
      status: 'PENDING',
    },
    include: {
      waitlistEntry: true,
      showSeat: true,
    },
  });

  if (expiredOffers.length === 0) return 0;

  for (const offer of expiredOffers) {
    await prisma.$transaction(async (tx) => {
      await tx.waitlistOffer.update({
        where: { id: offer.id },
        data: { status: 'EXPIRED' },
      });

      await tx.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: 'EXPIRED' },
      });
    });

    console.log(`[WAITLIST EXPIRED] Offer ${offer.id} expired. Re-evaluating next in line...`);
    // Re-assign seat to next person in queue
    await processCancelledSeatWaitlist(offer.showSeatId);
  }

  return expiredOffers.length;
};

export const getCustomerWaitlists = async (customerId: string) => {
  return await prisma.waitlistEntry.findMany({
    where: { customerId },
    include: {
      show: {
        include: { event: true, venue: true },
      },
      offers: {
        where: { status: 'PENDING' },
        include: {
          showSeat: { include: { seat: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

