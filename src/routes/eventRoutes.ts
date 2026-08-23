import { Router } from 'express';
import { getEvents, getEventById, getShowSeatMap } from '../services/eventService';
import { holdSeats, releaseHold } from '../services/holdService';
import { authenticateJWT, optionalAuthJWT, authorizeRoles, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { holdSeatsSchema, releaseSeatsSchema } from '../validations/schemas';

const router = Router();

// Public: Browse events with query filters
router.get('/events', async (req, res, next) => {
  try {
    const { search, type, venueId, date } = req.query;
    const events = await getEvents({
      search: search ? String(search) : undefined,
      type: type ? String(type) : undefined,
      venueId: venueId ? String(venueId) : undefined,
      date: date ? String(date) : undefined,
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// Public: Fetch single event with all shows
router.get('/events/:id', async (req, res, next) => {
  try {
    const event = await getEventById(req.params.id as string);
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// Public: Fetch show visual seat grid with live statuses & pricing
// Accepts optional JWT to mark heldByMe seats for the current user
router.get('/shows/:showId/seats', optionalAuthJWT, async (req: AuthRequest, res, next) => {
  try {
    const showId = req.params.showId as string;
    const userId = req.user?.userId;
    const seatMap = await getShowSeatMap(showId, userId);
    res.json(seatMap);
  } catch (err) {
    next(err);
  }
});

// Customer: Hold seat(s) with TTL
router.post('/shows/:showId/hold', authenticateJWT, authorizeRoles('CUSTOMER'), validateBody(holdSeatsSchema), async (req: AuthRequest, res, next) => {
  try {
    const { showSeatIds } = req.body;
    const showId = req.params.showId as string;
    const result = await holdSeats(req.user!.userId, showId, showSeatIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Customer: Release seat hold manually
router.post('/shows/:showId/release', authenticateJWT, authorizeRoles('CUSTOMER'), validateBody(releaseSeatsSchema), async (req: AuthRequest, res, next) => {
  try {
    const { showSeatIds } = req.body;
    const result = await releaseHold(req.user!.userId, showSeatIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
