"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const result = await (0, authService_1.registerUser)({ name, email, password, role });
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await (0, authService_1.loginUser)({ email, password });
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
