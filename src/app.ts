import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './config/prisma';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import organiserRoutes from './routes/organiserRoutes';
import eventRoutes from './routes/eventRoutes';
import bookingRoutes from './routes/bookingRoutes';
import waitlistRoutes from './routes/waitlistRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Anti-Abuse & Anti-Scalper Rate Limiters (disabled during automated test runs)
const isTestEnv = process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 0 : 500, // unlimited in tests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 0 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
});

const holdLimiter = rateLimit({
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
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organiser', organiserRoutes);
app.use('/api', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);

// Liveness Probe
app.get('/api/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

// Readiness Probe (Validates DB Connection)
app.get('/api/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'READY',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'UNAVAILABLE',
      database: 'DISCONNECTED',
      error: err.message,
    });
  }
});

// Centralized error handler
app.use(errorHandler);

export default app;
