"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prisma_1 = require("./config/prisma");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const organiserRoutes_1 = __importDefault(require("./routes/organiserRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const waitlistRoutes_1 = __importDefault(require("./routes/waitlistRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
// Security Headers with Helmet
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '2mb' }));
// Anti-Abuse & Anti-Scalper Rate Limiters (disabled during automated test runs)
const isTestEnv = process.env.NODE_ENV === 'test';
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isTestEnv ? 0 : 500, // unlimited in tests
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: isTestEnv ? 0 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
});
const holdLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: isTestEnv ? 0 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Excessive hold requests detected. Please wait before reserving more seats.' },
});
if (!isTestEnv) {
    app.use('/api', globalLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/shows/:showId/hold', holdLimiter);
}
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/organiser', organiserRoutes_1.default);
app.use('/api', eventRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/waitlist', waitlistRoutes_1.default);
// Liveness Probe
app.get('/api/health', (req, res) => {
    res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});
// Readiness Probe (Validates DB Connection)
app.get('/api/ready', async (req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'READY',
            database: 'CONNECTED',
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(503).json({
            status: 'UNAVAILABLE',
            database: 'DISCONNECTED',
            error: err.message,
        });
    }
});
// Centralized error handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
