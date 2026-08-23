# 🎫 Ticket Booking System (Backend & Concurrency Engine)

A high-concurrency ticket booking engine for movies and concerts built with Node.js, Express, TypeScript, Prisma ORM (SQLite / PostgreSQL), Socket.io, Nodemailer, and Jest.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**:
   - **ADMIN**: Create and manage venue layouts, seat grids (`totalRows` $\times$ `totalCols`), and seat category mappings (`VIP`, `PREMIUM`, `STANDARD`).
   - **ORGANISER**: Create event listings (movies & concerts), create showtimes with venue bindings & per-category pricing, view revenue & occupancy analytics.
   - **CUSTOMER**: Browse events, view interactive visual seat maps, hold seats, book tickets with instant QR code generation, receive email notifications, cancel bookings, and join waitlists.

2. **Concurrency Protection (Flash Sale Safe)**:
   - Atomic database transaction isolation with pessimistic row-locking (`SELECT ... FOR UPDATE`).
   - Parallel hold requests for the exact same seat automatically resolve with **1 success** and **$N-1$ HTTP 409 Conflicts**.

3. **Seat Hold & Auto-Release TTL Engine**:
   - Holds seats with a configurable TTL (default: 10 minutes).
   - Auto-release scheduler cleans up abandoned/expired holds every 15 seconds and broadcasts real-time WebSocket seat availability updates.

4. **Automated Waitlist Queue & Time-Limited Offer Flow**:
   - Customers join seat-category waitlists when shows sell out.
   - When a booking is cancelled, the system automatically reserves the seat for the top waitlisted customer, generates a time-limited offer (10 min TTL), and emails them a claim link.
   - If unclaimed before expiration, the offer auto-advances to the next customer in queue.

5. **QR Code Tickets & Automated Email Delivery**:
   - Confirmed bookings generate a high-res QR code encoding booking reference and ticket payload.
   - Automated HTML ticket emails dispatched via Nodemailer with embedded QR code attachments.

---

## 🛠️ Setup Guide

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm

### 2. Installation & Configuration
Clone the repository and install dependencies:
```bash
npm install
```

Copy `.env.example` to `.env`:
```env
DATABASE_URL="file:./dev.db"
PORT=5000
JWT_SECRET="ticket_booking_super_secret_jwt_key_2026"
NODE_ENV="development"
SEAT_HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=10
```

### 3. Database Migration & Setup
Initialize the database and Prisma client:
```bash
npx prisma db push
```

### 4. Running the Backend Server
Start the development server with live reload:
```bash
npm run dev
```
Server runs at `http://localhost:5001`.


### 5. Running Automated Tests
Run the comprehensive automated test suite (testing RBAC, venue setup, concurrency locks, hold TTL, QR generation, waitlist reallocation, and revenue analytics):
```bash
npm test
```

---

## 📖 API Documentation Summary

### 🔑 Authentication (`/api/auth`)
- `POST /api/auth/register` - Register user (`ADMIN`, `ORGANISER`, `CUSTOMER`)
- `POST /api/auth/login` - Authenticate & obtain JWT
- `GET /api/auth/me` - Get logged-in user profile

### 🏛️ Admin (`/api/admin`) [Requires `ADMIN` role]
- `POST /api/admin/venues` - Create venue & custom seat grid layout
- `GET /api/admin/venues` - List all venues
- `GET /api/admin/venues/:id` - Get venue details with seat layout
- `PUT /api/admin/venues/:id` - Update venue name and address
- `DELETE /api/admin/venues/:id` - Delete venue (if no active shows attached)

### 🎭 Organiser (`/api/organiser`) [Requires `ORGANISER` or `ADMIN` role]
- `POST /api/organiser/events` - Create movie or concert event listing
- `POST /api/organiser/shows` - Create show with venue binding, conflict checks & per-category pricing
- `GET /api/organiser/analytics/summary` - View revenue & seat occupancy metrics per event

### 🎬 Customer Events & Seats (`/api`)
- `GET /api/events` - Browse & filter events (supports `search`, `type`, `venueId`, `date`)
- `GET /api/events/:id` - View single event details with all showtimes
- `GET /api/shows/:showId/seats` - Get visual seat grid with live status (`AVAILABLE`, `HELD`, `BOOKED`), pricing, and sold-out stats
- `POST /api/shows/:showId/hold` - Hold seat(s) with TTL (Concurrency locks & waitlist protections enforced)
- `POST /api/shows/:showId/release` - Release seat hold manually

### 🎟️ Bookings & Waitlist (`/api/bookings`, `/api/waitlist`)
- `POST /api/bookings/confirm` - Confirm booking for held seats / waitlist offer (generates QR ticket & sends email)
- `GET /api/bookings/my` - View customer booking history
- `POST /api/bookings/:bookingId/cancel` - Cancel booking (triggers automated waitlist reallocation)
- `POST /api/bookings/verify` - Verify ticket QR payload / booking reference (Event check-in)
- `POST /api/waitlist/join` - Join category waitlist for sold-out show
- `GET /api/waitlist/my` - View waitlist status and pending offers
- `GET /api/waitlist/offers/:offerId` - View specific waitlist offer details and claim deadline
- `DELETE /api/waitlist/:waitlistId` - Leave / cancel waitlist position
- `POST /api/waitlist/offers/:offerId/claim` - Claim time-limited waitlist offer and confirm booking


---

## 🗄️ Database Schema Diagram

```
[User] ───< [Event] ───< [Show] ───< [ShowSeat] ───> [Seat] ───> [Venue]
  │                        │            │
  ├───< [SeatHold] ────────┤            ├───< [Booking]
  ├───< [WaitlistEntry] ───┤            └───< [WaitlistOffer]
```

---

## 📄 Deliverables Summary
1. Source Code with modular architecture in `src/`.
2. System Design Write-Up in `SYSTEM_DESIGN.md`.
3. Complete Jest Test Suite in `src/tests/backend.test.ts`.
