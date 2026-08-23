import { Router } from 'express';
import { confirmBooking, cancelBooking, getCustomerBookings, verifyBookingTicket } from '../services/bookingService';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { confirmBookingSchema, verifyTicketSchema } from '../validations/schemas';

const router = Router();

router.use(authenticateJWT);

// Customer: Confirm booking for held seats or waitlist offer
router.post('/confirm', authorizeRoles('CUSTOMER'), validateBody(confirmBookingSchema), async (req: AuthRequest, res, next) => {
  try {
    const { showId, showSeatIds, waitlistOfferId } = req.body;
    const bookingResult = await confirmBooking(req.user!.userId, {
      showId,
      showSeatIds,
      waitlistOfferId,
    });
    res.status(201).json(bookingResult);
  } catch (err) {
    next(err);
  }
});

// Customer: View booking history
router.get('/my', authorizeRoles('CUSTOMER'), async (req: AuthRequest, res, next) => {
  try {
    const bookings = await getCustomerBookings(req.user!.userId);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// Customer: Cancel a booking (triggers automated waitlist reallocation)
router.post('/:bookingId/cancel', authorizeRoles('CUSTOMER'), async (req: AuthRequest, res, next) => {
  try {
    const bookingId = req.params.bookingId as string;
    const result = await cancelBooking(req.user!.userId, bookingId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Organiser / Admin: Verify Ticket (Scan QR or check booking reference)
router.post('/verify', authorizeRoles('ORGANISER', 'ADMIN'), validateBody(verifyTicketSchema), async (req: AuthRequest, res, next) => {
  try {
    const { bookingReference } = req.body;
    const result = await verifyBookingTicket(bookingReference);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
