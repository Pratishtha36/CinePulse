"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventService_1 = require("../services/eventService");
const holdService_1 = require("../services/holdService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public: Browse events with query filters
router.get('/events', async (req, res, next) => {
    try {
        const { search, type } = req.query;
        const events = await (0, eventService_1.getEvents)({
            search: search ? String(search) : undefined,
            type: type ? String(type) : undefined,
        });
        res.json(events);
    }
    catch (err) {
        next(err);
    }
});
// Public: Fetch show visual seat grid with live statuses & pricing
router.get('/shows/:showId/seats', async (req, res, next) => {
    try {
        const showId = req.params.showId;
        const seatMap = await (0, eventService_1.getShowSeatMap)(showId);
        res.json(seatMap);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Hold seat(s) with TTL
router.post('/shows/:showId/hold', auth_1.authenticateJWT, async (req, res, next) => {
    try {
        const { showSeatIds } = req.body;
        if (!showSeatIds || !Array.isArray(showSeatIds)) {
            return res.status(400).json({ error: 'showSeatIds must be an array of seat IDs' });
        }
        const showId = req.params.showId;
        const result = await (0, holdService_1.holdSeats)(req.user.userId, showId, showSeatIds);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Customer: Release seat hold manually
router.post('/shows/:showId/release', auth_1.authenticateJWT, async (req, res, next) => {
    try {
        const { showSeatIds } = req.body;
        if (!showSeatIds || !Array.isArray(showSeatIds)) {
            return res.status(400).json({ error: 'showSeatIds must be an array' });
        }
        const result = await (0, holdService_1.releaseHold)(req.user.userId, showSeatIds);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
