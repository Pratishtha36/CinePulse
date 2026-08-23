"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const socketManager_1 = require("./sockets/socketManager");
const ttlScheduler_1 = require("./jobs/ttlScheduler");
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.io real-time engine
(0, socketManager_1.initSocketServer)(server);
// Start background TTL auto-release & waitlist expiry cron scheduler
(0, ttlScheduler_1.initTTLScheduler)();
const PORT = env_1.ENV.PORT;
server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Ticket Booking System Backend is running!`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`⚡ Environment: ${env_1.ENV.NODE_ENV}`);
    console.log(`=================================================`);
});
