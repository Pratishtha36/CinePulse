"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoReleaseExpiredHolds = exports.releaseHold = exports.holdSeats = void 0;
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const socketManager_1 = require("../sockets/socketManager");
const holdSeats = async (customerId, showId, showSeatIds) => {
    if (!showSeatIds || showSeatIds.length === 0) {
        throw { statusCode: 400, message: 'At least one seat must be selected to hold' };
    }
    const ttlMinutes = env_1.ENV.SEAT_HOLD_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    // Execute in isolated database transaction for concurrency protection
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const now = new Date();
        // 1. Fetch requested showSeats with their current holds
        const showSeats = await tx.showSeat.findMany({
            where: {
                id: { in: showSeatIds },
                showId: showId,
            },
            include: {
                seat: true,
                hold: true,
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
            if (ss.status === 'HELD' && ss.hold) {
                if (ss.hold.expiresAt <= now || ss.hold.status !== 'ACTIVE') {
                    // Expired hold - auto cleanup
                    await tx.seatHold.delete({ where: { id: ss.hold.id } });
                }
                else if (ss.hold.customerId !== customerId) {
                    // Active hold by someone else!
                    throw {
                        statusCode: 409,
                        message: `Seat ${ss.seat.rowLabel}${ss.seat.colNumber} is currently held by another user`,
                    };
                }
                else {
                    // Held by the SAME customer - refresh hold expiry
                    await tx.seatHold.delete({ where: { id: ss.hold.id } });
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
    });
    // Broadcast real-time Socket.io update
    (0, socketManager_1.emitSeatStatusUpdate)(showId, 'held', {
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
exports.holdSeats = holdSeats;
const releaseHold = async (customerId, showSeatIds) => {
    const released = await prisma_1.prisma.$transaction(async (tx) => {
        const holds = await tx.seatHold.findMany({
            where: {
                showSeatId: { in: showSeatIds },
                customerId: customerId,
                status: 'ACTIVE',
            },
            include: { showSeat: true },
        });
        if (holds.length === 0)
            return { count: 0, showId: null };
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
        (0, socketManager_1.emitSeatStatusUpdate)(released.showId, 'released', {
            showSeatIds,
        });
    }
    return { releasedCount: released.count };
};
exports.releaseHold = releaseHold;
// Auto-cleaner called by periodic scheduler
const autoReleaseExpiredHolds = async () => {
    const now = new Date();
    const expiredHolds = await prisma_1.prisma.seatHold.findMany({
        where: {
            expiresAt: { lte: now },
            status: 'ACTIVE',
        },
        include: { showSeat: true },
    });
    if (expiredHolds.length === 0)
        return 0;
    for (const hold of expiredHolds) {
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.seatHold.delete({ where: { id: hold.id } }).catch(() => { });
            await tx.showSeat.update({
                where: { id: hold.showSeatId },
                data: { status: 'AVAILABLE' },
            });
        });
        (0, socketManager_1.emitSeatStatusUpdate)(hold.showId, 'released', {
            showSeatIds: [hold.showSeatId],
            reason: 'TTL_EXPIRED',
        });
    }
    return expiredHolds.length;
};
exports.autoReleaseExpiredHolds = autoReleaseExpiredHolds;
