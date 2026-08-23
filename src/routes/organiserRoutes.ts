import { Router } from 'express';
import { createEvent, createShow, getOrganiserRevenueSummary } from '../services/eventService';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createEventSchema, createShowSchema } from '../validations/schemas';

const router = Router();

// Protect organiser routes for roles 'ORGANISER' or 'ADMIN'
router.use(authenticateJWT, authorizeRoles('ORGANISER', 'ADMIN'));

router.post('/events', validateBody(createEventSchema), async (req: AuthRequest, res, next) => {
  try {
    const event = await createEvent(req.user!.userId, req.body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.post('/shows', validateBody(createShowSchema), async (req: AuthRequest, res, next) => {
  try {
    const show = await createShow(req.user!.userId, req.body);
    res.status(201).json(show);
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/summary', async (req: AuthRequest, res, next) => {
  try {
    const summary = await getOrganiserRevenueSummary(req.user!.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
