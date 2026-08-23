"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const venueService_1 = require("../services/venueService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect all admin routes for role 'ADMIN'
router.use(auth_1.authenticateJWT, (0, auth_1.authorizeRoles)('ADMIN'));
router.post('/venues', async (req, res, next) => {
    try {
        const { name, address, totalRows, totalCols, categoryRules } = req.body;
        if (!name || !address || !totalRows || !totalCols) {
            return res.status(400).json({ error: 'name, address, totalRows, and totalCols are required' });
        }
        const venue = await (0, venueService_1.createVenue)({ name, address, totalRows, totalCols, categoryRules });
        res.status(201).json(venue);
    }
    catch (err) {
        next(err);
    }
});
router.get('/venues', async (req, res, next) => {
    try {
        const venues = await (0, venueService_1.getVenues)();
        res.json(venues);
    }
    catch (err) {
        next(err);
    }
});
router.get('/venues/:id', async (req, res, next) => {
    try {
        const venueId = req.params.id;
        const venue = await (0, venueService_1.getVenueById)(venueId);
        res.json(venue);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
