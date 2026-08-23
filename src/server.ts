import http from 'http';
import app from './app';
import { ENV } from './config/env';
import { prisma } from './config/prisma';
import { initSocketServer } from './sockets/socketManager';
import { initTTLScheduler } from './jobs/ttlScheduler';
import { logger } from './utils/logger';

const server = http.createServer(app);

// Initialize Socket.io real-time engine
initSocketServer(server);

// Start background TTL auto-release & waitlist expiry cron scheduler
initTTLScheduler();

const PORT = Number(ENV.PORT) || 5001;

server.listen(PORT, () => {
  logger.info('Ticket Booking System Backend started', {
    port: PORT,
    environment: ENV.NODE_ENV,
    url: `http://localhost:${PORT}`,
  });
});

// Graceful Shutdown Handlers (Kubernetes / Docker SIGTERM & SIGINT)
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Draining in-flight requests and shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP and WebSocket server connections closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma database connection pool disconnected.');
      process.exit(0);
    } catch (err: any) {
      logger.error('Error during database disconnect', { error: err.message });
      process.exit(1);
    }
  });

  // Force shutdown after 10s if connections refuse to close
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing termination.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
