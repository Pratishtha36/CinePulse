import { Router } from 'express';
import { createVenue, getVenues, getVenueById, updateVenue, deleteVenue } from '../services/venueService';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createVenueSchema, updateVenueSchema } from '../validations/schemas';

const router = Router();

router.use(authenticateJWT);

// Create Venue — Admin only
router.post('/venues', authorizeRoles('ADMIN'), validateBody(createVenueSchema), async (req, res, next) => {
  try {
    const venue = await createVenue(req.body);
    res.status(201).json(venue);
  } catch (err) {
    next(err);
  }
});

// View Venues — Admin or Organiser
router.get('/venues', authorizeRoles('ADMIN', 'ORGANISER'), async (req, res, next) => {
  try {
    const venues = await getVenues();
    res.json(venues);
  } catch (err) {
    next(err);
  }
});

// View Venue Details — Admin or Organiser
router.get('/venues/:id', authorizeRoles('ADMIN', 'ORGANISER'), async (req, res, next) => {
  try {
    const venueId = req.params.id as string;
    const venue = await getVenueById(venueId);
    res.json(venue);
  } catch (err) {
    next(err);
  }
});

// Update Venue — Admin only
router.put('/venues/:id', authorizeRoles('ADMIN'), validateBody(updateVenueSchema), async (req, res, next) => {
  try {
    const venueId = req.params.id as string;
    const updated = await updateVenue(venueId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete Venue — Admin only
router.delete('/venues/:id', authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const venueId = req.params.id as string;
    const result = await deleteVenue(venueId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
