"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventService_1 = require("../services/eventService");
const holdService_1 = require("../services/holdService");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validations/schemas");
const router = (0, express_1.Router)();
// Public: Browse events with query filters
router.get('/events', async (req, res, next) => {
    try {
        const { search, type, venueId, date } = req.query;
        const events = await (0, eventService_1.getEvents)({
            search: search ? String(search) : undefined,
            type: type ? String(type) : undefined,
            venueId: venueId ? String(venueId) : undefined,
            date: date ? String(date) : undefined,
        });
        res.json(events);
    }
    catch (err) {
        next(err);
    }
});
// Public: Fetch single event with all shows
router.get('/events/:id', async (req, res, next) => {
    try {
        const event = await (0, eventService_1.getEventById)(req.params.id);
        res.json(event);
    }
    catch (err) {
        next(err);
    }
});
// Public: Fetch show visual seat grid with live statuses & pricing
// Accepts optional JWT to mark heldByMe seats for the current user
router.get('/shows/:showId/seats', auth_1.optionalAuthJWT, async (req, res, next) => {
    try {
        const showId = req.params.showId;
        const userId = req.user?.userId;
        const seatMap = await (0, eventService_1.getShowSeatMap)(showId, userId);
        res.json(seatMap);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Hold seat(s) with TTL
router.post('/shows/:showId/hold', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)('CUSTOMER'), (0, validate_1.validateBody)(schemas_1.holdSeatsSchema), async (req, res, next) => {
    try {
        const { showSeatIds } = req.body;
        const showId = req.params.showId;
        const result = await (0, holdService_1.holdSeats)(req.user.userId, showId, showSeatIds);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Release seat hold manually
router.post('/shows/:showId/release', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)('CUSTOMER'), (0, validate_1.validateBody)(schemas_1.releaseSeatsSchema), async (req, res, next) => {
    try {
        const { showSeatIds } = req.body;
        const result = await (0, holdService_1.releaseHold)(req.user.userId, showSeatIds);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
