"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerWaitlists = exports.autoAdvanceExpiredWaitlistOffers = exports.processCancelledSeatWaitlist = exports.joinWaitlist = void 0;
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const emailService_1 = require("./emailService");
const socketManager_1 = require("../sockets/socketManager");
const joinWaitlist = async (customerId, showId, seatCategory) => {
    const show = await prisma_1.prisma.show.findUnique({
        where: { id: showId },
        include: { event: true, venue: true },
    });
    if (!show)
        throw { statusCode: 404, message: 'Show not found' };
    // Check if category exists in categoryPrices
    const categoryPrices = JSON.parse(show.categoryPrices || '{}');
    if (!(seatCategory in categoryPrices)) {
        throw { statusCode: 400, message: `Invalid seat category '${seatCategory}' for this show` };
    }
    // Check if customer already waiting for this show and category
    const existing = await prisma_1.prisma.waitlistEntry.findFirst({
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
    const entry = await prisma_1.prisma.waitlistEntry.create({
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
    const queuePosition = await prisma_1.prisma.waitlistEntry.count({
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
exports.joinWaitlist = joinWaitlist;
const processCancelledSeatWaitlist = async (showSeatId) => {
    const showSeat = await prisma_1.prisma.showSeat.findUnique({
        where: { id: showSeatId },
        include: { seat: true, show: { include: { event: true, venue: true } } },
    });
    if (!showSeat)
        return;
    const category = showSeat.seat.category;
    const showId = showSeat.showId;
    // Find next customer waiting for this category (FIFO by createdAt)
    const nextWaitlistEntry = await prisma_1.prisma.waitlistEntry.findFirst({
        where: {
            showId,
            seatCategory: category,
            status: 'WAITING',
        },
        orderBy: { createdAt: 'asc' },
        include: { customer: true },
    });
    if (nextWaitlistEntry) {
        const offerTtlMinutes = env_1.ENV.WAITLIST_OFFER_TTL_MINUTES;
        const offerExpiresAt = new Date(Date.now() + offerTtlMinutes * 60 * 1000);
        // Reserve seat for waitlisted customer & create offer
        await prisma_1.prisma.$transaction(async (tx) => {
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
            const claimUrl = `http://localhost:${env_1.ENV.PORT}/api/waitlist/offers/${offer.id}/claim`;
            // Send email notification with claim link
            await (0, emailService_1.sendWaitlistOfferEmail)({
                toEmail: nextWaitlistEntry.customer.email,
                customerName: nextWaitlistEntry.customer.name,
                eventTitle: showSeat.show.event.title,
                seatCategory: category,
                seatLabel: `${showSeat.seat.rowLabel}${showSeat.seat.colNumber}`,
                offerExpiresAt,
                claimOfferUrl: claimUrl,
            });
        });
        (0, socketManager_1.emitSeatStatusUpdate)(showId, 'held', {
            showSeatIds: [showSeatId],
            reason: 'WAITLIST_OFFER',
            offerExpiresAt,
        });
        console.log(`[WAITLIST] Offer assigned to ${nextWaitlistEntry.customer.email} for seat ${showSeat.seat.rowLabel}${showSeat.seat.colNumber}`);
    }
    else {
        // No one on waitlist - seat becomes AVAILABLE
        await prisma_1.prisma.showSeat.update({
            where: { id: showSeatId },
            data: { status: 'AVAILABLE' },
        });
        (0, socketManager_1.emitSeatStatusUpdate)(showId, 'released', {
            showSeatIds: [showSeatId],
            reason: 'CANCELLATION_NO_WAITLIST',
        });
    }
};
exports.processCancelledSeatWaitlist = processCancelledSeatWaitlist;
const autoAdvanceExpiredWaitlistOffers = async () => {
    const now = new Date();
    const expiredOffers = await prisma_1.prisma.waitlistOffer.findMany({
        where: {
            offerExpiresAt: { lte: now },
            status: 'PENDING',
        },
        include: {
            waitlistEntry: true,
            showSeat: true,
        },
    });
    if (expiredOffers.length === 0)
        return 0;
    for (const offer of expiredOffers) {
        await prisma_1.prisma.$transaction(async (tx) => {
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
        await (0, exports.processCancelledSeatWaitlist)(offer.showSeatId);
    }
    return expiredOffers.length;
};
exports.autoAdvanceExpiredWaitlistOffers = autoAdvanceExpiredWaitlistOffers;
const getCustomerWaitlists = async (customerId) => {
    return await prisma_1.prisma.waitlistEntry.findMany({
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
exports.getCustomerWaitlists = getCustomerWaitlists;
