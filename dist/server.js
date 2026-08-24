"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const prisma_1 = require("./config/prisma");
const socketManager_1 = require("./sockets/socketManager");
const ttlScheduler_1 = require("./jobs/ttlScheduler");
const logger_1 = require("./utils/logger");
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.io real-time engine
(0, socketManager_1.initSocketServer)(server);
// Start background TTL auto-release & waitlist expiry cron scheduler
(0, ttlScheduler_1.initTTLScheduler)();
const PORT = Number(env_1.ENV.PORT) || 5001;
server.listen(PORT, () => {
    logger_1.logger.info('Ticket Booking System Backend started', {
        port: PORT,
        environment: env_1.ENV.NODE_ENV,
        url: `http://localhost:${PORT}`,
    });
});
// Graceful Shutdown Handlers (Kubernetes / Docker SIGTERM & SIGINT)
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Draining in-flight requests and shutting down gracefully...`);
    server.close(async () => {
        logger_1.logger.info('HTTP and WebSocket server connections closed.');
        try {
            await prisma_1.prisma.$disconnect();
            logger_1.logger.info('Prisma database connection pool disconnected.');
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.error('Error during database disconnect', { error: err.message });
            process.exit(1);
        }
    });
    // Force shutdown after 10s if connections refuse to close
    setTimeout(() => {
        logger_1.logger.error('Graceful shutdown timed out. Forcing termination.');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
