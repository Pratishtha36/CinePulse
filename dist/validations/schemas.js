"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimWaitlistOfferSchema = exports.joinWaitlistSchema = exports.verifyTicketSchema = exports.confirmBookingSchema = exports.releaseSeatsSchema = exports.holdSeatsSchema = exports.createShowSchema = exports.createEventSchema = exports.updateVenueSchema = exports.createVenueSchema = exports.googleAuthSchema = exports.demoLoginSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ==========================================
// Authentication Schemas
// ==========================================
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: zod_1.z.string().email('Invalid email address format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']).optional().default('CUSTOMER'),
    adminSecret: zod_1.z.string().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.demoLoginSchema = zod_1.z.object({
    role: zod_1.z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']).default('CUSTOMER'),
});
exports.googleAuthSchema = zod_1.z.object({
    credential: zod_1.z.string().min(1, 'Google credential token is required'),
    role: zod_1.z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']).optional().default('CUSTOMER'),
});
// ==========================================
// Venue & Admin Schemas
// ==========================================
exports.createVenueSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Venue name must be at least 2 characters').max(100),
    address: zod_1.z.string().min(3, 'Address must be at least 3 characters'),
    totalRows: zod_1.z.number().int().min(1, 'At least 1 row is required').max(26, 'Max 26 rows supported'),
    totalCols: zod_1.z.number().int().min(1, 'At least 1 column is required').max(50, 'Max 50 columns supported'),
    categoryRules: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
exports.updateVenueSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    address: zod_1.z.string().min(3).optional(),
});
// ==========================================
// Event & Organiser Schemas
// ==========================================
exports.createEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Title must be at least 2 characters').max(150),
    description: zod_1.z.string().min(5, 'Description must be at least 5 characters'),
    type: zod_1.z.enum(['MOVIE', 'CONCERT']),
    posterUrl: zod_1.z.string().url('Invalid poster URL').optional().or(zod_1.z.literal('')),
});
exports.createShowSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid('Invalid event ID format'),
    venueId: zod_1.z.string().uuid('Invalid venue ID format'),
    startTime: zod_1.z.string().datetime({ message: 'Invalid start time ISO format' }),
    endTime: zod_1.z.string().datetime({ message: 'Invalid end time ISO format' }),
    categoryPrices: zod_1.z.object({
        VIP: zod_1.z.number().positive('VIP price must be greater than 0'),
        PREMIUM: zod_1.z.number().positive('PREMIUM price must be greater than 0'),
        STANDARD: zod_1.z.number().positive('STANDARD price must be greater than 0'),
    }),
});
// ==========================================
// Seat Hold & Release Schemas
// ==========================================
exports.holdSeatsSchema = zod_1.z.object({
    showSeatIds: zod_1.z.array(zod_1.z.string().uuid('Invalid seat ID format')).min(1, 'At least one seat ID must be provided'),
});
exports.releaseSeatsSchema = zod_1.z.object({
    showSeatIds: zod_1.z.array(zod_1.z.string().uuid('Invalid seat ID format')).min(1, 'At least one seat ID must be provided'),
});
// ==========================================
// Booking Schemas
// ==========================================
exports.confirmBookingSchema = zod_1.z.object({
    showId: zod_1.z.string().uuid('Invalid show ID format'),
    showSeatIds: zod_1.z.array(zod_1.z.string().uuid('Invalid seat ID format')).min(1, 'At least one seat ID must be provided'),
    waitlistOfferId: zod_1.z.string().uuid().optional(),
});
exports.verifyTicketSchema = zod_1.z.object({
    bookingReference: zod_1.z.string().min(3, 'Booking reference is required'),
});
// ==========================================
// Waitlist Schemas
// ==========================================
exports.joinWaitlistSchema = zod_1.z.object({
    showId: zod_1.z.string().uuid('Invalid show ID format'),
    seatCategory: zod_1.z.enum(['VIP', 'PREMIUM', 'STANDARD']),
});
exports.claimWaitlistOfferSchema = zod_1.z.object({
    showId: zod_1.z.string().uuid('Invalid show ID format'),
    showSeatId: zod_1.z.string().uuid('Invalid seat ID format'),
});
