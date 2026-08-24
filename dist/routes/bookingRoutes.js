"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingService_1 = require("../services/bookingService");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validations/schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
// Customer: Confirm booking for held seats or waitlist offer
router.post('/confirm', (0, auth_1.authorizeRoles)('CUSTOMER'), (0, validate_1.validateBody)(schemas_1.confirmBookingSchema), async (req, res, next) => {
    try {
        const { showId, showSeatIds, waitlistOfferId } = req.body;
        const bookingResult = await (0, bookingService_1.confirmBooking)(req.user.userId, {
            showId,
            showSeatIds,
            waitlistOfferId,
        });
        res.status(201).json(bookingResult);
    }
    catch (err) {
        next(err);
    }
});
// Customer: View booking history
router.get('/my', (0, auth_1.authorizeRoles)('CUSTOMER'), async (req, res, next) => {
    try {
        const bookings = await (0, bookingService_1.getCustomerBookings)(req.user.userId);
        res.json(bookings);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Cancel a booking (triggers automated waitlist reallocation)
router.post('/:bookingId/cancel', (0, auth_1.authorizeRoles)('CUSTOMER'), async (req, res, next) => {
    try {
        const bookingId = req.params.bookingId;
        const result = await (0, bookingService_1.cancelBooking)(req.user.userId, bookingId);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Organiser / Admin: Verify Ticket (Scan QR or check booking reference)
router.post('/verify', (0, auth_1.authorizeRoles)('ORGANISER', 'ADMIN'), (0, validate_1.validateBody)(schemas_1.verifyTicketSchema), async (req, res, next) => {
    try {
        const { bookingReference } = req.body;
        const result = await (0, bookingService_1.verifyBookingTicket)(bookingReference);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
