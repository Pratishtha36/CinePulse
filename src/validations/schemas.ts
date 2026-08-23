import { z } from 'zod';

// ==========================================
// Authentication Schemas
// ==========================================
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']).optional().default('CUSTOMER'),
  adminSecret: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const demoLoginSchema = z.object({
  role: z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']).default('CUSTOMER'),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential token is required'),
  role: z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']).optional().default('CUSTOMER'),
});


// ==========================================
// Venue & Admin Schemas
// ==========================================
export const createVenueSchema = z.object({
  name: z.string().min(2, 'Venue name must be at least 2 characters').max(100),
  address: z.string().min(3, 'Address must be at least 3 characters'),
  totalRows: z.number().int().min(1, 'At least 1 row is required').max(26, 'Max 26 rows supported'),
  totalCols: z.number().int().min(1, 'At least 1 column is required').max(50, 'Max 50 columns supported'),
  categoryRules: z.record(z.string(), z.string()).optional(),
});

export const updateVenueSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(3).optional(),
});

// ==========================================
// Event & Organiser Schemas
// ==========================================
export const createEventSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  type: z.enum(['MOVIE', 'CONCERT']),
  posterUrl: z.string().url('Invalid poster URL').optional().or(z.literal('')),
});

export const createShowSchema = z.object({
  eventId: z.string().uuid('Invalid event ID format'),
  venueId: z.string().uuid('Invalid venue ID format'),
  startTime: z.string().datetime({ message: 'Invalid start time ISO format' }),
  endTime: z.string().datetime({ message: 'Invalid end time ISO format' }),
  categoryPrices: z.object({
    VIP: z.number().positive('VIP price must be greater than 0'),
    PREMIUM: z.number().positive('PREMIUM price must be greater than 0'),
    STANDARD: z.number().positive('STANDARD price must be greater than 0'),
  }),
});

// ==========================================
// Seat Hold & Release Schemas
// ==========================================
export const holdSeatsSchema = z.object({
  showSeatIds: z.array(z.string().uuid('Invalid seat ID format')).min(1, 'At least one seat ID must be provided'),
});

export const releaseSeatsSchema = z.object({
  showSeatIds: z.array(z.string().uuid('Invalid seat ID format')).min(1, 'At least one seat ID must be provided'),
});

// ==========================================
// Booking Schemas
// ==========================================
export const confirmBookingSchema = z.object({
  showId: z.string().uuid('Invalid show ID format'),
  showSeatIds: z.array(z.string().uuid('Invalid seat ID format')).min(1, 'At least one seat ID must be provided'),
  waitlistOfferId: z.string().uuid().optional(),
});

export const verifyTicketSchema = z.object({
  bookingReference: z.string().min(3, 'Booking reference is required'),
});

// ==========================================
// Waitlist Schemas
// ==========================================
export const joinWaitlistSchema = z.object({
  showId: z.string().uuid('Invalid show ID format'),
  seatCategory: z.enum(['VIP', 'PREMIUM', 'STANDARD']),
});

export const claimWaitlistOfferSchema = z.object({
  showId: z.string().uuid('Invalid show ID format'),
  showSeatId: z.string().uuid('Invalid seat ID format'),
});
