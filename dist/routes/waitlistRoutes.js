"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const waitlistService_1 = require("../services/waitlistService");
const bookingService_1 = require("../services/bookingService");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validations/schemas");
const router = (0, express_1.Router)();
// Protect all waitlist routes for role 'CUSTOMER'
router.use(auth_1.authenticateJWT, (0, auth_1.authorizeRoles)('CUSTOMER'));
// Customer: Join waitlist for specific show and seat category
router.post('/join', (0, validate_1.validateBody)(schemas_1.joinWaitlistSchema), async (req, res, next) => {
    try {
        const { showId, seatCategory } = req.body;
        const result = await (0, waitlistService_1.joinWaitlist)(req.user.userId, showId, seatCategory);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Leave waitlist
router.delete('/:waitlistId', async (req, res, next) => {
    try {
        const waitlistId = req.params.waitlistId;
        const result = await (0, waitlistService_1.leaveWaitlist)(req.user.userId, waitlistId);
        res.json(result);
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
// Customer: Get specific offer details
router.get('/offers/:offerId', async (req, res, next) => {
    try {
        const offerId = req.params.offerId;
        const details = await (0, waitlistService_1.getWaitlistOfferDetails)(offerId);
        res.json(details);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Claim waitlist offer & convert directly into booking
router.post('/offers/:offerId/claim', (0, validate_1.validateBody)(schemas_1.claimWaitlistOfferSchema), async (req, res, next) => {
    try {
        const offerId = req.params.offerId;
        const { showId, showSeatId } = req.body;
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
