import nodeCron from 'node-cron';
import { autoReleaseExpiredHolds } from '../services/holdService';
import { autoAdvanceExpiredWaitlistOffers } from '../services/waitlistService';

export const initTTLScheduler = () => {
  console.log('[SCHEDULER] Initializing background TTL & Waitlist expiry tasks...');

  // Run every 15 seconds to enforce real-time TTL precision
  nodeCron.schedule('*/15 * * * * *', async () => {
    try {
      const releasedHoldsCount = await autoReleaseExpiredHolds();
      if (releasedHoldsCount > 0) {
        console.log(`[SCHEDULER] Auto-released ${releasedHoldsCount} expired seat hold(s)`);
      }

      const expiredOffersCount = await autoAdvanceExpiredWaitlistOffers();
      if (expiredOffersCount > 0) {
        console.log(`[SCHEDULER] Auto-advanced ${expiredOffersCount} expired waitlist offer(s)`);
      }
    } catch (err) {
      console.error('[SCHEDULER ERROR] Failure during TTL cleanup execution:', err);
    }
  });
};
