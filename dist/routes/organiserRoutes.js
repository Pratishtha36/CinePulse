"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventService_1 = require("../services/eventService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect organiser routes for roles 'ORGANISER' or 'ADMIN'
router.use(auth_1.authenticateJWT, (0, auth_1.authorizeRoles)('ORGANISER', 'ADMIN'));
router.post('/events', async (req, res, next) => {
    try {
        const { title, description, type, posterUrl } = req.body;
        if (!title || !description || !type) {
            return res.status(400).json({ error: 'title, description, and type (MOVIE/CONCERT) are required' });
        }
        const event = await (0, eventService_1.createEvent)(req.user.userId, { title, description, type, posterUrl });
        res.status(201).json(event);
    }
    catch (err) {
        next(err);
    }
});
router.post('/shows', async (req, res, next) => {
    try {
        const { eventId, venueId, startTime, endTime, categoryPrices } = req.body;
        if (!eventId || !venueId || !startTime || !endTime || !categoryPrices) {
            return res.status(400).json({ error: 'eventId, venueId, startTime, endTime, and categoryPrices are required' });
        }
        const show = await (0, eventService_1.createShow)(req.user.userId, {
            eventId,
            venueId,
            startTime,
            endTime,
            categoryPrices,
        });
        res.status(201).json(show);
    }
    catch (err) {
        next(err);
    }
});
router.get('/analytics/summary', async (req, res, next) => {
    try {
        const summary = await (0, eventService_1.getOrganiserRevenueSummary)(req.user.userId);
        res.json(summary);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
