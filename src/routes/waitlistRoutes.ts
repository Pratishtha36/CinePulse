import { Router } from 'express';
import {
  joinWaitlist,
  leaveWaitlist,
  getCustomerWaitlists,
  getWaitlistOfferDetails,
} from '../services/waitlistService';
import { confirmBooking } from '../services/bookingService';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { joinWaitlistSchema, claimWaitlistOfferSchema } from '../validations/schemas';

const router = Router();

// Protect all waitlist routes for role 'CUSTOMER'
router.use(authenticateJWT, authorizeRoles('CUSTOMER'));

// Customer: Join waitlist for specific show and seat category
router.post('/join', validateBody(joinWaitlistSchema), async (req: AuthRequest, res, next) => {
  try {
    const { showId, seatCategory } = req.body;
    const result = await joinWaitlist(req.user!.userId, showId, seatCategory);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Customer: Leave waitlist
router.delete('/:waitlistId', async (req: AuthRequest, res, next) => {
  try {
    const waitlistId = req.params.waitlistId as string;
    const result = await leaveWaitlist(req.user!.userId, waitlistId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Customer: Get my waitlist entries
router.get('/my', async (req: AuthRequest, res, next) => {
  try {
    const waitlists = await getCustomerWaitlists(req.user!.userId);
    res.json(waitlists);
  } catch (err) {
    next(err);
  }
});

// Customer: Get specific offer details
router.get('/offers/:offerId', async (req: AuthRequest, res, next) => {
  try {
    const offerId = req.params.offerId as string;
    const details = await getWaitlistOfferDetails(offerId);
    res.json(details);
  } catch (err) {
    next(err);
  }
});

// Customer: Claim waitlist offer & convert directly into booking
router.post('/offers/:offerId/claim', validateBody(claimWaitlistOfferSchema), async (req: AuthRequest, res, next) => {
  try {
    const offerId = req.params.offerId as string;
    const { showId, showSeatId } = req.body;
    const bookingResult = await confirmBooking(req.user!.userId, {
      showId,
      showSeatIds: [showSeatId],
      waitlistOfferId: offerId,
    });
    res.json(bookingResult);
  } catch (err) {
    next(err);
  }
});

export default router;
