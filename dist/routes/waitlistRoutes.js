"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const waitlistService_1 = require("../services/waitlistService");
const bookingService_1 = require("../services/bookingService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
// Customer: Join waitlist for specific show and seat category
router.post('/join', async (req, res, next) => {
    try {
        const { showId, seatCategory } = req.body;
        if (!showId || !seatCategory) {
            return res.status(400).json({ error: 'showId and seatCategory are required' });
        }
        const result = await (0, waitlistService_1.joinWaitlist)(req.user.userId, showId, seatCategory);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Get my waitlist entries
router.get('/my', async (req, res, next) => {
    try {
        const waitlists = await (0, waitlistService_1.getCustomerWaitlists)(req.user.userId);
        res.json(waitlists);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Claim waitlist offer & convert directly into booking
router.post('/offers/:offerId/claim', async (req, res, next) => {
    try {
        const offerId = req.params.offerId;
        const { showId, showSeatId } = req.body;
        if (!showId || !showSeatId) {
            return res.status(400).json({ error: 'showId and showSeatId are required' });
        }
        const bookingResult = await (0, bookingService_1.confirmBooking)(req.user.userId, {
            showId,
            showSeatIds: [showSeatId],
            waitlistOfferId: offerId,
        });
        res.json(bookingResult);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
