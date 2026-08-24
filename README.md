# CinePulse - High-Concurrency Ticket Booking & Event Operations Platform

CinePulse is an enterprise-grade ticket booking and box office operations system engineered for high-concurrency environments, flash sales, and live admission management. Built with Node.js, Express, TypeScript, Prisma ORM, React, Tailwind CSS, Cloudflare R2 / AWS S3, Socket.io, and Nodemailer.

---

## Production-Grade Architecture & Engineering Highlights

### 1. Concurrency Control and Race Condition Mitigation
* **Pessimistic and Atomic Transactions**: Critical operations (seat holds, booking confirmations, waitlist claims) execute within isolated database transactions.
* **Flash Sale Protection**: When dozens of concurrent requests attempt to reserve the exact same seat simultaneously, the transaction engine guarantees that exactly one request succeeds while all competing requests receive deterministic HTTP 409 Conflict responses without data corruption or overselling.
* **Versioned Seat State**: Utilizes state versioning on seat records to prevent race conditions across distributed instances.

### 2. Direct-to-Cloud Asset Pipeline (AWS S3 / Cloudflare R2 / CDN)
* **Presigned Upload Architecture**: Media assets (event and movie posters) bypass the application server via short-lived, cryptographically signed PUT URLs, enabling direct browser-to-cloud uploads. This eliminates server memory buffering and CPU bottlenecks.
* **Edge CDN Integration**: Static assets are served via high-speed Content Delivery Networks with immutable cache-control headers (`public, max-age=31536000, immutable`), minimizing origin load and latency.
* **Fail-Safe Server Proxy Fallback**: If a client encounters restrictive corporate firewalls or missing bucket CORS headers, the system automatically falls back to an authenticated server-side upload stream without breaking the user experience.
* **Strict Media Validation**: Enforces MIME-type verification, 5MB file size limits, and sanitizes filenames into cryptographically random UUIDs to prevent directory traversal and overwrite attacks.

### 3. Time-To-Live (TTL) Seat Hold Engine
* **Non-Blocking Temporary Holds**: When a customer selects seats, temporary reservations are acquired with a configurable TTL (default: 10 minutes).
* **Automated TTL Scheduler**: A background worker audits and cleans expired holds every 15 seconds, immediately freeing stale inventory.
* **Real-Time WebSocket Synchronization**: State changes (holds, releases, bookings) broadcast via Socket.io to all connected clients, ensuring instant map updates without manual page refreshes.

### 4. Automated Waitlist Queue and Priority Reallocation
* **Category-Based Waitlists**: When a showtime sells out, customers can join an ordered queue for specific seat tiers (VIP, Premium, Standard).
* **Automated Event-Driven Offer Dispatch**: When an existing booking is cancelled or a hold expires, the concurrency engine identifies the next eligible waitlisted customer, places a dedicated hold, and dispatches a time-sensitive reservation offer via email.
* **Auto-Advancement**: If an offered ticket is not claimed within the designated window, the system automatically marks the offer as expired and forwards the seat to the next waitlisted user.

### 5. Admission Verification and QR Code Engine
* **High-Density QR Tickets**: Each confirmed ticket generates a high-resolution QR payload containing signed booking references, show metadata, and customer details.
* **Gate Validator Tool**: Organisers and venue staff can scan tickets directly at entrance gates using the verification scanner API, providing sub-second validation and preventing duplicate entry.

### 6. Transactional Email System
* **Dual Environment Support**: Built-in Ethereal test inbox generation for local testing with zero setup, seamlessly switching to authenticated SMTP (Gmail, Resend, SendGrid, Amazon SES) in production.
* **Embedded Media Support**: Emails include embedded ticket QR codes (`cid` attachments) ensuring display across all standard mobile and desktop email clients.

### 7. Defense-in-Depth Security and Anti-Abuse
* **Role-Based Access Control (RBAC)**: Strict separation of privileges across Administrator, Organiser, and Customer personas enforced via JWT middleware and Zod schema validations.
* **Tiered Rate Limiting**: Independent rate limiters protect authentication routes (brute-force defense), seat hold APIs (anti-scalping / anti-bot), and file upload endpoints.
* **Security Headers**: Hardened with Helmet HTTP headers, strict Cross-Origin Resource Policies (CORP), and CORS protections.

### 8. Reliability and Health Monitoring
* **Liveness Probe** (`GET /api/health`): Monitors application process responsiveness.
* **Readiness Probe** (`GET /api/ready`): Validates database connectivity via active connection pinging.

---

## Role-Based Portals

* **Administrator Studio**: Design auditorium layouts, configure seat matrices (`totalRows` x `totalCols`), and define tier category rules (VIP, Premium, Standard).
* **Organiser Hub**: Publish events, configure showtime slots with custom tier pricing, view live box office gross revenue analytics, and scan attendee tickets at the gate.
* **Customer Interface**: Browse catalog, filter by production type, view real-time interactive seat maps, reserve seats, claim waitlist offers, and manage bookings.

---

## Architecture Diagram

```
[ Customer / Organiser / Admin Clients ]
                   │
                   ├─── HTTP REST APIs ───> [ Helmet / Rate Limiting Middleware ]
                   ├─── Direct Cloud Upload ───> [ Cloudflare R2 / AWS S3 + CDN ]
                   └─── WebSockets (Socket.io) <─── [ Real-time Event Broadcaster ]
                                                           │
                                             [ Express + TypeScript API ]
                                                           │
                      ┌────────────────────────────────────┼────────────────────────────────────┐
                      ▼                                    ▼                                    ▼
         [ Concurrency Engine ]                  [ TTL Hold Scheduler ]              [ Email Service ]
         (Row Locks & Transactions)              (Background Worker)                 (Nodemailer / SMTP)
                      │                                    │                                    │
                      └────────────────────────────────────┴────────────────────────────────────┘
                                                           │
                                              [ Prisma ORM / Database ]
```

---

## Tech Stack

* **Backend**: Node.js, Express, TypeScript, Prisma ORM, Socket.io, Nodemailer, Zod, Helmet, Multer
* **Cloud Storage**: AWS S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`), Cloudflare R2
* **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons
* **Testing**: Jest, Supertest, TS-Jest
* **Database**: SQLite (Development) / PostgreSQL or MySQL (Production)

---

## Getting Started

### 1. Prerequisites
* Node.js (v18 or higher)
* npm (v9 or higher)

### 2. Installation
Clone the repository and install dependencies for backend and frontend:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
npm install --prefix client
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="file:./dev.db"

JWT_SECRET=your_jwt_secret_key_2026
ADMIN_SECRET=your_admin_secret_key_2026
GOOGLE_CLIENT_ID=

SEAT_HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=10
MAX_SEATS_PER_HOLD=10

# Cloud Object Storage (Cloudflare R2 or AWS S3)
S3_BUCKET_NAME=
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
CDN_URL=

# SMTP Email Configuration (Optional for dev, uses Ethereal by default)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="CinePulse Tickets <tickets@cinepulse.com>"
```

### 4. Database Setup and Seeding
Initialize the database schema and seed default administrative personas and sample auditorium data:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

Default credentials created by the seed script:
* **Admin**: `admin@cinepulse.com` / `password123`
* **Organiser**: `organiser@events.com` / `password123`
* **Customer**: `alice@gmail.com` / `password123`

### 5. Running the Application
Run both backend API and frontend client concurrently:

```bash
npm run dev:all
```

* Frontend: `http://localhost:5173`
* Backend API: `http://localhost:5001`

---

## Automated Test Suite

The system includes a comprehensive integration and concurrency test suite covering RBAC, venue builders, atomic row-level concurrency locks, hold TTL expiration, QR validation, waitlist transitions, and cloud asset presigning.

Run the test suite:

```bash
npm test
```

---

## API Reference

### Authentication (`/api/auth`)
* `POST /api/auth/register` - Register a new user (`CUSTOMER`, `ORGANISER`, `ADMIN`)
* `POST /api/auth/login` - User login and JWT issuance
* `POST /api/auth/google` - Google OAuth 2.0 verification and login
* `POST /api/auth/demo` - Instant persona session switcher for development
* `GET /api/auth/me` - Authenticated user identity inspection

### Administrator (`/api/admin`) [Requires `ADMIN`]
* `POST /api/admin/venues` - Create auditorium and define seat category matrices
* `GET /api/admin/venues` - List all configured venues
* `GET /api/admin/venues/:id` - Retrieve venue structure and seating layouts
* `PUT /api/admin/venues/:id` - Update venue metadata
* `DELETE /api/admin/venues/:id` - Delete venue (if unattached to active shows)

### Organiser (`/api/organiser`) [Requires `ORGANISER` or `ADMIN`]
* `POST /api/organiser/upload/presigned-url` - Generate short-lived direct cloud upload URL
* `POST /api/organiser/upload/local` - Server-side upload proxy fallback
* `POST /api/organiser/events` - Publish new movie or concert catalog entry
* `POST /api/organiser/shows` - Schedule showtime slot with venue binding and tier pricing
* `GET /api/organiser/analytics/summary` - Gross revenue and occupancy metrics ledger

### Public Catalog and Seating (`/api`)
* `GET /api/events` - Search and filter event catalog (`search`, `type`, `venueId`, `date`)
* `GET /api/events/:id` - Retrieve event details and upcoming show schedules
* `GET /api/shows/:showId/seats` - Retrieve visual seat map with real-time availability states
* `POST /api/shows/:showId/hold` - Acquire atomic seat hold with TTL
* `POST /api/shows/:showId/release` - Release active seat hold

### Bookings and Waitlist (`/api/bookings`, `/api/waitlist`)
* `POST /api/bookings/confirm` - Convert active holds or waitlist offers into confirmed tickets
* `GET /api/bookings/my` - Customer booking history and QR codes
* `POST /api/bookings/:bookingId/cancel` - Cancel booking and trigger waitlist reallocation
* `POST /api/bookings/verify` - Admission gate scanner validation
* `POST /api/waitlist/join` - Join seat category waitlist for sold-out showtimes
* `GET /api/waitlist/my` - Retrieve active waitlist positions and pending offers
* `POST /api/waitlist/offers/:offerId/claim` - Claim time-limited waitlist offer

### System Health
* `GET /api/health` - Liveness probe
* `GET /api/ready` - Database readiness probe

---

## Production Deployment Checklist

1. **Object Storage CORS**: Configure CORS on the S3 / Cloudflare R2 bucket to permit `PUT` and `GET` requests from the production domain.
2. **CDN Distribution**: Connect a custom domain or Cloudflare / CloudFront distribution to your bucket for cached asset delivery.
3. **Environment Secrets**: Populate production environment variables (`JWT_SECRET`, `ADMIN_SECRET`, SMTP credentials, S3 keys) in hosting dashboards (Render, Railway, AWS ECS, Vercel).
4. **Database Migration**: Run `npx prisma migrate deploy` or `npx prisma db push` during build steps.
