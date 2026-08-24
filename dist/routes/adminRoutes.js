"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const venueService_1 = require("../services/venueService");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validations/schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
// Create Venue — Admin only
router.post('/venues', (0, auth_1.authorizeRoles)('ADMIN'), (0, validate_1.validateBody)(schemas_1.createVenueSchema), async (req, res, next) => {
    try {
        const venue = await (0, venueService_1.createVenue)(req.body);
        res.status(201).json(venue);
    }
    catch (err) {
        next(err);
    }
});
// View Venues — Admin or Organiser
router.get('/venues', (0, auth_1.authorizeRoles)('ADMIN', 'ORGANISER'), async (req, res, next) => {
    try {
        const venues = await (0, venueService_1.getVenues)();
        res.json(venues);
    }
    catch (err) {
        next(err);
    }
});
// View Venue Details — Admin or Organiser
router.get('/venues/:id', (0, auth_1.authorizeRoles)('ADMIN', 'ORGANISER'), async (req, res, next) => {
    try {
        const venueId = req.params.id;
        const venue = await (0, venueService_1.getVenueById)(venueId);
        res.json(venue);
    }
    catch (err) {
        next(err);
    }
});
// Update Venue — Admin only
router.put('/venues/:id', (0, auth_1.authorizeRoles)('ADMIN'), (0, validate_1.validateBody)(schemas_1.updateVenueSchema), async (req, res, next) => {
    try {
        const venueId = req.params.id;
        const updated = await (0, venueService_1.updateVenue)(venueId, req.body);
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
// Delete Venue — Admin only
router.delete('/venues/:id', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res, next) => {
    try {
        const venueId = req.params.id;
        const result = await (0, venueService_1.deleteVenue)(venueId);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
