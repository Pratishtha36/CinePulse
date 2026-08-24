"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerBookings = exports.verifyBookingTicket = exports.cancelBooking = exports.confirmBooking = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../config/prisma");
const qrService_1 = require("./qrService");
const emailService_1 = require("./emailService");
const waitlistService_1 = require("./waitlistService");
const socketManager_1 = require("../sockets/socketManager");
const confirmBooking = async (customerId, params) => {
    const { showId, showSeatIds, waitlistOfferId } = params;
    if (!showSeatIds || showSeatIds.length === 0) {
        throw { statusCode: 400, message: 'At least one seat must be selected to book' };
    }
    const customer = await prisma_1.prisma.user.findUnique({ where: { id: customerId } });
    if (!customer)
        throw { statusCode: 404, message: 'Customer not found' };
    // Run transactional booking
    const bookingsCreated = await prisma_1.prisma.$transaction(async (tx) => {
        const show = await tx.show.findUnique({
            where: { id: showId },
            include: { event: true, venue: true },
        });
        if (!show)
            throw { statusCode: 404, message: 'Show not found' };
        const categoryPrices = JSON.parse(show.categoryPrices || '{}');
        const now = new Date();
        const createdBookings = [];
        // If claiming a waitlist offer, validate it applies to exactly this seat
        if (waitlistOfferId) {
            if (showSeatIds.length !== 1) {
                throw { statusCode: 400, message: 'A waitlist offer can only be claimed for exactly 1 seat' };
            }
            const offer = await tx.waitlistOffer.findUnique({
                where: { id: waitlistOfferId },
                include: { waitlistEntry: true },
            });
            if (!offer ||
                offer.status !== 'PENDING' ||
                offer.offerExpiresAt <= now ||
                offer.waitlistEntry.customerId !== customerId ||
                offer.showSeatId !== showSeatIds[0]) {
                throw { statusCode: 400, message: 'Invalid, expired, or mismatched waitlist offer for this seat' };
            }
            await tx.waitlistOffer.update({
                where: { id: offer.id },
                data: { status: 'CLAIMED' },
            });
            await tx.waitlistEntry.update({
                where: { id: offer.waitlistEntryId },
                data: { status: 'BOOKED' },
            });
        }
        for (const showSeatId of showSeatIds) {
            const showSeat = await tx.showSeat.findUnique({
                where: { id: showSeatId },
                include: { seat: true, hold: true },
            });
            if (!showSeat) {
                throw { statusCode: 404, message: 'Seat not found' };
            }
            if (showSeat.status === 'BOOKED') {
                throw { statusCode: 409, message: `Seat ${showSeat.seat.rowLabel}${showSeat.seat.colNumber} is already booked` };
            }
            // Normal hold check if not claiming via waitlist offer
            if (!waitlistOfferId) {
                if (!showSeat.hold || showSeat.hold.customerId !== customerId || showSeat.hold.expiresAt <= now) {
                    throw {
                        statusCode: 400,
                        message: `You do not have an active hold on seat ${showSeat.seat.rowLabel}${showSeat.seat.colNumber}. Please hold seat first.`,
                    };
                }
                // Clean up hold
                await tx.seatHold.delete({ where: { id: showSeat.hold.id } });
            }
            // Update seat status to BOOKED
            await tx.showSeat.update({
                where: { id: showSeatId },
                data: { status: 'BOOKED', version: { increment: 1 } },
            });
            // Generate unique booking reference
            const refSuffix = crypto_1.default.randomUUID().split('-')[0].toUpperCase();
            const bookingRef = `TKT-${refSuffix}`;
            const seatPrice = categoryPrices[showSeat.seat.category] || 0;
            // Generate QR Code data URL
            const qrDataUrl = await (0, qrService_1.generateQRCodeDataUrl)({
                bookingReference: bookingRef,
                showId,
                customerEmail: customer.email,
                seats: [`${showSeat.seat.rowLabel}${showSeat.seat.colNumber}`],
            });
            const booking = await tx.booking.create({
                data: {
                    bookingReference: bookingRef,
                    showSeatId: showSeatId,
                    showId: showId,
                    customerId: customerId,
                    pricePaid: seatPrice,
                    status: 'CONFIRMED',
                    qrCodeData: qrDataUrl,
                },
                include: {
                    showSeat: { include: { seat: true } },
                    show: { include: { event: true, venue: true } },
                },
            });
            createdBookings.push(booking);
        }
        return { createdBookings, show };
    }, { maxWait: 15000, timeout: 20000 });
    const bookings = bookingsCreated.createdBookings;
    const show = bookingsCreated.show;
    // Send confirmation emails and emit real-time socket updates
    const seatLabels = bookings.map((b) => `${b.showSeat.seat.rowLabel}${b.showSeat.seat.colNumber}`).join(', ');
    const totalPaid = bookings.reduce((sum, b) => sum + b.pricePaid, 0);
    const mainBookingRef = bookings[0].bookingReference;
    (0, emailService_1.sendBookingConfirmationEmail)({
        toEmail: customer.email,
        customerName: customer.name,
        eventTitle: show.event.title,
        venueName: show.venue.name,
        showTime: new Date(show.startTime).toLocaleString(),
        seatInfo: seatLabels,
        bookingReference: mainBookingRef,
        qrCodeDataUrl: bookings[0].qrCodeData,
        totalPaid,
    });
    (0, socketManager_1.emitSeatStatusUpdate)(showId, 'booked', {
        showSeatIds,
        bookedBy: customerId,
    });
    return {
        message: 'Booking confirmed successfully!',
        bookingReference: mainBookingRef,
        totalPaid,
        totalAmount: totalPaid,
        eventTitle: show.event.title,
        venueName: show.venue.name,
        startTime: show.startTime,
        qrCode: bookings[0]?.qrCodeData,
        qrCodeDataUrl: bookings[0]?.qrCodeData,
        show: {
            id: show.id,
            startTime: show.startTime,
            event: { title: show.event.title },
            venue: { name: show.venue.name },
        },
        tickets: bookings.map((b) => ({
            bookingId: b.id,
            bookingReference: b.bookingReference,
            seat: `${b.showSeat.seat.rowLabel}${b.showSeat.seat.colNumber}`,
            rowLabel: b.showSeat.seat.rowLabel,
            colNumber: b.showSeat.seat.colNumber,
            category: b.showSeat.seat.category,
            price: b.pricePaid,
            qrCodeDataUrl: b.qrCodeData,
        })),
    };
};
exports.confirmBooking = confirmBooking;
const cancelBooking = async (customerId, bookingId) => {
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            showSeat: { include: { seat: true } },
            show: true,
            customer: true,
        },
    });
    if (!booking)
        throw { statusCode: 404, message: 'Booking not found' };
    if (booking.customerId !== customerId) {
        throw { statusCode: 403, message: 'Not authorized to cancel this booking' };
    }
    if (booking.status === 'CANCELLED') {
        throw { statusCode: 400, message: 'Booking is already cancelled' };
    }
    if (new Date(booking.show.startTime) <= new Date()) {
        throw {
            statusCode: 400,
            message: 'Cannot cancel booking for a show that has already started or ended.',
        };
    }
    // Cancel booking in transaction
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
        });
    });
    console.log(`[CANCELLATION] Booking ${booking.bookingReference} cancelled by ${booking.customer.email}`);
    // Automatically trigger waitlist assignment for freed seat!
    await (0, waitlistService_1.processCancelledSeatWaitlist)(booking.showSeatId);
    return {
        message: 'Booking successfully cancelled.',
        cancelledBookingReference: booking.bookingReference,
        seatFreed: `${booking.showSeat.seat.rowLabel}${booking.showSeat.seat.colNumber}`,
    };
};
exports.cancelBooking = cancelBooking;
const verifyBookingTicket = async (bookingReference) => {
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { bookingReference },
        include: {
            customer: { select: { id: true, name: true, email: true } },
            showSeat: { include: { seat: true } },
            show: { include: { event: true, venue: true } },
        },
    });
    if (!booking) {
        throw { statusCode: 404, message: 'Ticket reference not found' };
    }
    return {
        valid: booking.status === 'CONFIRMED',
        status: booking.status,
        bookingReference: booking.bookingReference,
        customer: booking.customer,
        eventTitle: booking.show.event.title,
        venueName: booking.show.venue.name,
        showStartTime: booking.show.startTime,
        seat: `${booking.showSeat.seat.rowLabel}${booking.showSeat.seat.colNumber}`,
        category: booking.showSeat.seat.category,
        pricePaid: booking.pricePaid,
        createdAt: booking.createdAt,
    };
};
exports.verifyBookingTicket = verifyBookingTicket;
const getCustomerBookings = async (customerId) => {
    return await prisma_1.prisma.booking.findMany({
        where: { customerId },
        include: {
            showSeat: {
                include: { seat: true },
            },
            show: {
                include: { event: true, venue: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};
exports.getCustomerBookings = getCustomerBookings;
