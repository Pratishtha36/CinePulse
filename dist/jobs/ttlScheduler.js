"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTTLScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const holdService_1 = require("../services/holdService");
const waitlistService_1 = require("../services/waitlistService");
const initTTLScheduler = () => {
    console.log('[SCHEDULER] Initializing background TTL & Waitlist expiry tasks...');
    // Run every 15 seconds to enforce real-time TTL precision
    node_cron_1.default.schedule('*/15 * * * * *', async () => {
        try {
            const releasedHoldsCount = await (0, holdService_1.autoReleaseExpiredHolds)();
            if (releasedHoldsCount > 0) {
                console.log(`[SCHEDULER] Auto-released ${releasedHoldsCount} expired seat hold(s)`);
            }
            const expiredOffersCount = await (0, waitlistService_1.autoAdvanceExpiredWaitlistOffers)();
            if (expiredOffersCount > 0) {
                console.log(`[SCHEDULER] Auto-advanced ${expiredOffersCount} expired waitlist offer(s)`);
            }
        }
        catch (err) {
            console.error('[SCHEDULER ERROR] Failure during TTL cleanup execution:', err);
        }
    });
};
exports.initTTLScheduler = initTTLScheduler;
