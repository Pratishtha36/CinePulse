"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventService_1 = require("../services/eventService");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validations/schemas");
const router = (0, express_1.Router)();
// Protect organiser routes for roles 'ORGANISER' or 'ADMIN'
router.use(auth_1.authenticateJWT, (0, auth_1.authorizeRoles)('ORGANISER', 'ADMIN'));
router.post('/events', (0, validate_1.validateBody)(schemas_1.createEventSchema), async (req, res, next) => {
    try {
        const event = await (0, eventService_1.createEvent)(req.user.userId, req.body);
        res.status(201).json(event);
    }
    catch (err) {
        next(err);
    }
});
router.post('/shows', (0, validate_1.validateBody)(schemas_1.createShowSchema), async (req, res, next) => {
    try {
        const show = await (0, eventService_1.createShow)(req.user.userId, req.body);
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
