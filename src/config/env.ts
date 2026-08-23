import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5001',

  JWT_SECRET: process.env.JWT_SECRET || 'ticket_booking_super_secret_jwt_key_2026',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SEAT_HOLD_TTL_MINUTES: parseInt(process.env.SEAT_HOLD_TTL_MINUTES || '10', 10),
  WAITLIST_OFFER_TTL_MINUTES: parseInt(process.env.WAITLIST_OFFER_TTL_MINUTES || '10', 10),
  MAX_SEATS_PER_HOLD: parseInt(process.env.MAX_SEATS_PER_HOLD || '10', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ADMIN_SECRET: process.env.ADMIN_SECRET || 'super_admin_secret_key_2026',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || '"Ticket System" <tickets@ticketbooking.com>',
};
