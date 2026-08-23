import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

describe('Ticket Booking System - Comprehensive Backend & Concurrency Test Suite', () => {
  let adminToken: string;
  let organiserToken: string;
  let customer1Token: string;
  let customer2Token: string;

  let customer1Id: string;
  let customer2Id: string;

  let concurrentTokens: string[] = [];

  let venueId: string;
  let eventId: string;
  let showId: string;

  let vipShowSeatId: string;
  let premiumShowSeatId: string;

  beforeAll(async () => {
    // Clean database before tests
    await prisma.booking.deleteMany();
    await prisma.waitlistOffer.deleteMany();
    await prisma.waitlistEntry.deleteMany();
    await prisma.seatHold.deleteMany();
    await prisma.showSeat.deleteMany();
    await prisma.show.deleteMany();
    await prisma.event.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. User Registration and JWT Auth with RBAC', async () => {
    // Register Admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'System Admin', email: 'admin@system.com', password: 'Password123!', role: 'ADMIN' });
    expect(adminRes.status).toBe(201);
    adminToken = adminRes.body.token;

    // Register Organiser
    const orgRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Event Organiser', email: 'organiser@events.com', password: 'Password123!', role: 'ORGANISER' });
    expect(orgRes.status).toBe(201);
    organiserToken = orgRes.body.token;

    // Register Customer 1
    const cust1Res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice Customer', email: 'alice@gmail.com', password: 'Password123!', role: 'CUSTOMER' });
    expect(cust1Res.status).toBe(201);
    customer1Token = cust1Res.body.token;
    customer1Id = cust1Res.body.user.id;

    // Register Customer 2
    const cust2Res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob Waitlist', email: 'bob@gmail.com', password: 'Password123!', role: 'CUSTOMER' });
    expect(cust2Res.status).toBe(201);
    customer2Token = cust2Res.body.token;
    customer2Id = cust2Res.body.user.id;

    // Register 10 distinct customers for concurrent hold testing
    for (let i = 0; i < 10; i++) {
      const cRes = await request(app)
        .post('/api/auth/register')
        .send({ name: `User ${i}`, email: `user${i}@concurrency.com`, password: 'Password123!', role: 'CUSTOMER' });
      concurrentTokens.push(cRes.body.token);
    }
  });

  test('2. Admin Creates Venue & Grid Layout', async () => {
    const res = await request(app)
      .post('/api/admin/venues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Grand Arena Hall',
        address: '100 Metro Boulevard',
        totalRows: 3,
        totalCols: 4, // 12 seats total
        categoryRules: { A: 'VIP', B: 'PREMIUM', C: 'STANDARD' },
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Grand Arena Hall');
    expect(res.body.seats.length).toBe(12);
    venueId = res.body.id;
  });

  test('3. Organiser Creates Event & Show with Seat Seeding', async () => {
    // Create Event
    const eventRes = await request(app)
      .post('/api/organiser/events')
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({
        title: 'Rock World Tour 2026',
        description: 'Live in Concert',
        type: 'CONCERT',
      });

    expect(eventRes.status).toBe(201);
    eventId = eventRes.body.id;

    // Create Show
    const showRes = await request(app)
      .post('/api/organiser/shows')
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({
        eventId,
        venueId,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
        categoryPrices: { VIP: 100, PREMIUM: 60, STANDARD: 30 },
      });

    expect(showRes.status).toBe(201);
    showId = showRes.body.id;
  });

  test('4. Fetch Seat Map for Show', async () => {
    const res = await request(app).get(`/api/shows/${showId}/seats`);
    expect(res.status).toBe(200);
    expect(res.body.seats.length).toBe(12);
    expect(res.body.seats[0].status).toBe('AVAILABLE');

    // Find specific VIP and PREMIUM seats
    const vipSeat = res.body.seats.find((s: any) => s.category === 'VIP' && s.rowLabel === 'A' && s.colNumber === 1);
    const premiumSeat = res.body.seats.find((s: any) => s.category === 'PREMIUM' && s.rowLabel === 'B' && s.colNumber === 1);

    expect(vipSeat).toBeDefined();
    expect(premiumSeat).toBeDefined();

    vipShowSeatId = vipSeat.showSeatId;
    premiumShowSeatId = premiumSeat.showSeatId;
  });

  test('5. CONCURRENCY TEST: 10 Parallel Hold Requests for Same Seat by 10 Distinct Users', async () => {
    // Dispatch 10 parallel HTTP hold requests for seat A1 (VIP) simultaneously by 10 distinct users!
    const requests = concurrentTokens.map((token) => {
      return request(app)
        .post(`/api/shows/${showId}/hold`)
        .set('Authorization', `Bearer ${token}`)
        .send({ showSeatIds: [vipShowSeatId] });
    });

    const responses = await Promise.all(requests);

    const successfulHolds = responses.filter((r) => r.status === 200);
    const conflictedHolds = responses.filter((r) => r.status === 409);

    expect(successfulHolds.length).toBe(1);
    expect(conflictedHolds.length).toBe(9);

    // Release hold so Alice can hold and book it in step 6
    const winnerToken = concurrentTokens[responses.findIndex((r) => r.status === 200)];
    await request(app)
      .post(`/api/shows/${showId}/release`)
      .set('Authorization', `Bearer ${winnerToken}`)
      .send({ showSeatIds: [vipShowSeatId] });
  });

  test('6. Complete Booking with QR Ticket Generation', async () => {
    // Alice holds VIP seat A1
    const holdRes = await request(app)
      .post(`/api/shows/${showId}/hold`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ showSeatIds: [vipShowSeatId] });
    expect(holdRes.status).toBe(200);

    // Alice confirms booking
    const res = await request(app)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        showId,
        showSeatIds: [vipShowSeatId],
      });

    expect(res.status).toBe(201);
    expect(res.body.bookingReference).toContain('TKT-');
    expect(res.body.tickets[0].price).toBe(100); // VIP price 100
    expect(res.body.tickets[0].qrCodeDataUrl).toContain('data:image/png;base64,');

    // Book all remaining VIP seats (A2, A3, A4) so VIP category is 100% sold out for waitlist test
    const allSeatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const otherVipSeats = allSeatsRes.body.seats.filter((s: any) => s.category === 'VIP' && s.status === 'AVAILABLE');
    for (let i = 0; i < otherVipSeats.length; i++) {
      const seat = otherVipSeats[i];
      const token = concurrentTokens[i];
      await request(app)
        .post(`/api/shows/${showId}/hold`)
        .set('Authorization', `Bearer ${token}`)
        .send({ showSeatIds: [seat.showSeatId] });
      await request(app)
        .post('/api/bookings/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ showId, showSeatIds: [seat.showSeatId] });
    }
  });


  test('7. Hold Abandonment & Manual Release', async () => {
    // Alice holds Premium seat B1
    const holdRes = await request(app)
      .post(`/api/shows/${showId}/hold`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ showSeatIds: [premiumShowSeatId] });
    expect(holdRes.status).toBe(200);

    // Alice releases hold
    const releaseRes = await request(app)
      .post(`/api/shows/${showId}/release`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ showSeatIds: [premiumShowSeatId] });

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.releasedCount).toBe(1);

    // Verify status is AVAILABLE again
    const mapRes = await request(app).get(`/api/shows/${showId}/seats`);
    const b1Seat = mapRes.body.seats.find((s: any) => s.showSeatId === premiumShowSeatId);
    expect(b1Seat.status).toBe('AVAILABLE');
  });

  test('8. Automated Waitlist Queue & Reallocation Flow on Cancellation', async () => {
    // VIP category is now 100% sold out (A1, A2, A3, A4 are all booked)
    // Bob joins waitlist for VIP category
    const waitlistRes = await request(app)
      .post('/api/waitlist/join')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ showId, seatCategory: 'VIP' });

    expect(waitlistRes.status).toBe(201);
    expect(waitlistRes.body.queuePosition).toBe(1);

    // Alice cancels her booking for VIP Seat A1
    const myBookings = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${customer1Token}`);
    
    const aliceBooking = myBookings.body.find((b: any) => b.status === 'CONFIRMED' && b.showSeat.showSeatId === vipShowSeatId || b.showSeat.seat.rowLabel === 'A' && b.showSeat.seat.colNumber === 1);
    expect(aliceBooking).toBeDefined();

    const cancelRes = await request(app)
      .post(`/api/bookings/${aliceBooking.id}/cancel`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(cancelRes.status).toBe(200);

    // Verify Bob automatically received a pending Waitlist Offer!
    const bobsWaitlists = await request(app)
      .get('/api/waitlist/my')
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(bobsWaitlists.body.length).toBe(1);
    const offer = bobsWaitlists.body[0].offers[0];
    expect(offer).toBeDefined();
    expect(offer.status).toBe('PENDING');

    // Bob inspects the offer details
    const offerDetails = await request(app)
      .get(`/api/waitlist/offers/${offer.id}`)
      .set('Authorization', `Bearer ${customer2Token}`);
    expect(offerDetails.status).toBe(200);
    expect(offerDetails.body.category).toBe('VIP');

    // Bob claims the waitlist offer and converts it to a booking!
    const claimRes = await request(app)
      .post(`/api/waitlist/offers/${offer.id}/claim`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        showId,
        showSeatId: offer.showSeatId,
      });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.bookingReference).toContain('TKT-');

    // 10. Verify Ticket using verification endpoint (Organiser / Gate Staff)
    const verifyRes = await request(app)
      .post('/api/bookings/verify')
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ bookingReference: claimRes.body.bookingReference });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.customer.email).toBe('bob@gmail.com');
  });

  test('9. Organiser Revenue Summary', async () => {
    const res = await request(app)
      .get('/api/organiser/analytics/summary')
      .set('Authorization', `Bearer ${organiserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    // 4 VIP tickets booked total = 400
    expect(res.body[0].totalRevenue).toBe(400);
  });

  test('10. Admin Venue Update and Route Coverage', async () => {
    const updateRes = await request(app)
      .put(`/api/admin/venues/${venueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Grand Arena Hall (Renovated)' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Grand Arena Hall (Renovated)');
  });
});

