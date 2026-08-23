# System Design Write-Up: Ticket Booking Engine

## 1. Overview & Architecture
The Ticket Booking Engine is an event-driven system built with Node.js, Express, TypeScript, Prisma ORM, and Socket.io. It guarantees ACID transaction safety under high concurrency during flash-sale conditions while providing real-time visual seat map updates and an automated waitlist reallocation lifecycle.

---

## 2. Concurrency Protection & Simultaneous Selection
To prevent double-booking and double-holding when thousands of users attempt to hold or book the exact same seat simultaneously, the system uses **isolated Database Row-Level Lock Transactions** combined with **Optimistic Versioning**.

### Hold & Booking Lock Flow:
1. **Transaction Isolation**: Every hold or booking request executes inside a strict Prisma database transaction (`$transaction`).
2. **Pessimistic Seat Inspection**: Before granting a hold or booking, the engine locks and inspects the requested `ShowSeat` row.
3. **Atomic Verification**:
   - If `ShowSeat.status === 'BOOKED'`, the transaction rolls back immediately and returns HTTP `409 Conflict`.
   - If `ShowSeat.status === 'HELD'` by another user with an unexpired TTL, the transaction rolls back with HTTP `409 Conflict`.
   - If `ShowSeat.status === 'AVAILABLE'` (or held by the same user), the transaction updates the seat status, increments its `version`, records a `SeatHold`, and commits atomically.
4. **Result**: Out of $N$ simultaneous requests for the exact same seat, precisely **one request succeeds** and $N-1$ requests fail gracefully with deterministic conflict responses.

---

## 3. Seat Hold & TTL Auto-Release Mechanism
To ensure held seats do not remain locked if a customer abandons checkout, seat holds enforce a configurable **Time-To-Live (TTL)** (default: 10 minutes).

### Mechanism:
1. **Timestamped Expiry**: When a seat is held, a `SeatHold` record is created with `expiresAt = now() + TTL`.
2. **Dual-Layer Enforcement**:
   - **Passive / On-Demand Check**: When any user queries or attempts to hold a seat, stale holds (`expiresAt <= now()`) are treated as `AVAILABLE` and auto-cleared on the fly inside the database query.
   - **Active Background Scheduler**: A background worker (`node-cron`) executes every 15 seconds. It sweeps for active holds past their `expiresAt`, deletes them from `SeatHold`, resets `ShowSeat.status = 'AVAILABLE'`, and emits a real-time `seat:released` event to all connected WebSocket clients via Socket.io.

---

## 4. Automated Waitlist Queue & Time-Limited Offer Flow
When an event seat category (e.g., `VIP`, `PREMIUM`, `STANDARD`) sells out, customers can join a FIFO waitlist queue per seat category.

```
[Booking Cancelled] 
       │
       ▼
Look up oldest 'WAITING' customer for (showId, category)
       │
  ┌────┴──────────────────────────┐
  │ Waitlisted Customer Found?    │
  └────┬──────────────────────────┘
       ├── YES ──► Reserve seat ('HELD') ──► Create WaitlistOffer with TTL ──► Email Claim Link
       │
       └── NO  ──► Reset seat to 'AVAILABLE' ──► Broadcast Socket Update
```

### Cancellation & Auto-Reallocation Lifecycle:
1. **Trigger**: When a confirmed booking is cancelled via `POST /api/bookings/:id/cancel`, the booking is marked `CANCELLED`.
2. **Queue Lookup**: The system queries `WaitlistEntry` for the matching `showId` and `seatCategory` sorted by `createdAt ASC` (oldest first).
3. **Offer Generation**:
   - The freed seat is marked `HELD` (reserved exclusively for the waitlisted customer).
   - A `WaitlistOffer` is created with a time-limited claim window (`offerExpiresAt = now() + 10 mins`).
   - The customer receives an email notification with a direct claim link (`/api/waitlist/offers/:id/claim`).
4. **Time-Limited Offer Expiry**:
   - If the waitlisted customer claims the offer before `offerExpiresAt`, the seat is booked.
   - If the offer expires without redemption, the background scheduler marks the offer and waitlist entry as `EXPIRED`, and automatically triggers `processCancelledSeatWaitlist` to reallocate the seat to the next person in line.

---

## 5. Real-Time Seat Map Data Model & WebSockets
- **Visual Seat Map**: Venues define a 2D matrix (`totalRows` $\times$ `totalCols`) with row labels (`A`, `B`, `C`) and seat categories.
- **State Synchronization**: `Socket.io` maintains dedicated room channels (`show_{showId}`). When seat holds, releases, or bookings occur, state diffs (`seat:held`, `seat:released`, `seat:booked`) are broadcast in under 20ms to all active clients viewing the seat map.
