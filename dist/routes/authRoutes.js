"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validations/schemas");
const router = (0, express_1.Router)();
router.post('/register', (0, validate_1.validateBody)(schemas_1.registerSchema), async (req, res, next) => {
    try {
        const result = await (0, authService_1.registerUser)(req.body);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
router.post('/login', (0, validate_1.validateBody)(schemas_1.loginSchema), async (req, res, next) => {
    try {
        const result = await (0, authService_1.loginUser)(req.body);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Google OAuth 2.0 Sign-In
router.post('/google', (0, validate_1.validateBody)(schemas_1.googleAuthSchema), async (req, res, next) => {
    try {
        const result = await (0, authService_1.loginWithGoogle)(req.body);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// One-click demo login for instant persona workspace switching
router.post('/demo', (0, validate_1.validateBody)(schemas_1.demoLoginSchema), async (req, res, next) => {
    try {
        const { role } = req.body;
        const result = await (0, authService_1.demoLogin)(role || 'CUSTOMER');
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.get('/me', auth_1.authenticateJWT, (req, res) => {
    res.json({ user: req.user });
});
exports.default = router;
