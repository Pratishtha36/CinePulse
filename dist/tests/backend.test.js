"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const prisma_1 = require("../config/prisma");
describe('Ticket Booking System - Comprehensive Backend & Concurrency Test Suite', () => {
    let adminToken;
    let organiserToken;
    let customer1Token;
    let customer2Token;
    let customer1Id;
    let customer2Id;
    let concurrentTokens = [];
    let venueId;
    let eventId;
    let showId;
    let vipShowSeatId;
    let premiumShowSeatId;
    beforeAll(async () => {
        // Clean database before tests
        await prisma_1.prisma.booking.deleteMany();
        await prisma_1.prisma.waitlistOffer.deleteMany();
        await prisma_1.prisma.waitlistEntry.deleteMany();
        await prisma_1.prisma.seatHold.deleteMany();
        await prisma_1.prisma.showSeat.deleteMany();
        await prisma_1.prisma.show.deleteMany();
        await prisma_1.prisma.event.deleteMany();
        await prisma_1.prisma.seat.deleteMany();
        await prisma_1.prisma.venue.deleteMany();
        await prisma_1.prisma.user.deleteMany();
    });
    afterAll(async () => {
        await prisma_1.prisma.$disconnect();
    });
    test('1. User Registration and JWT Auth with RBAC', async () => {
        // Register Admin
        const adminRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/register')
            .send({ name: 'System Admin', email: 'admin@system.com', password: 'Password123!', role: 'ADMIN' });
        expect(adminRes.status).toBe(201);
        adminToken = adminRes.body.token;
        // Register Organiser
        const orgRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/register')
            .send({ name: 'Event Organiser', email: 'organiser@events.com', password: 'Password123!', role: 'ORGANISER' });
        expect(orgRes.status).toBe(201);
        organiserToken = orgRes.body.token;
        // Register Customer 1
        const cust1Res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/register')
            .send({ name: 'Alice Customer', email: 'alice@gmail.com', password: 'Password123!', role: 'CUSTOMER' });
        expect(cust1Res.status).toBe(201);
        customer1Token = cust1Res.body.token;
        customer1Id = cust1Res.body.user.id;
        // Register Customer 2
        const cust2Res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/register')
            .send({ name: 'Bob Waitlist', email: 'bob@gmail.com', password: 'Password123!', role: 'CUSTOMER' });
        expect(cust2Res.status).toBe(201);
        customer2Token = cust2Res.body.token;
        customer2Id = cust2Res.body.user.id;
        // Register 10 distinct customers for concurrent hold testing
        for (let i = 0; i < 10; i++) {
            const cRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send({ name: `User ${i}`, email: `user${i}@concurrency.com`, password: 'Password123!', role: 'CUSTOMER' });
            concurrentTokens.push(cRes.body.token);
        }
    });
    test('2. Admin Creates Venue & Grid Layout', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
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
        const eventRes = await (0, supertest_1.default)(app_1.default)
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
        const showRes = await (0, supertest_1.default)(app_1.default)
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
        const res = await (0, supertest_1.default)(app_1.default).get(`/api/shows/${showId}/seats`);
        expect(res.status).toBe(200);
        expect(res.body.seats.length).toBe(12);
        expect(res.body.seats[0].status).toBe('AVAILABLE');
        // Find specific VIP and PREMIUM seats
        const vipSeat = res.body.seats.find((s) => s.category === 'VIP' && s.rowLabel === 'A' && s.colNumber === 1);
        const premiumSeat = res.body.seats.find((s) => s.category === 'PREMIUM' && s.rowLabel === 'B' && s.colNumber === 1);
        expect(vipSeat).toBeDefined();
        expect(premiumSeat).toBeDefined();
        vipShowSeatId = vipSeat.showSeatId;
        premiumShowSeatId = premiumSeat.showSeatId;
    });
    test('5. CONCURRENCY TEST: 10 Parallel Hold Requests for Same Seat by 10 Distinct Users', async () => {
        // Dispatch 10 parallel HTTP hold requests for seat A1 (VIP) simultaneously by 10 distinct users!
        const requests = concurrentTokens.map((token) => {
            return (0, supertest_1.default)(app_1.default)
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
        await (0, supertest_1.default)(app_1.default)
            .post(`/api/shows/${showId}/release`)
            .set('Authorization', `Bearer ${winnerToken}`)
            .send({ showSeatIds: [vipShowSeatId] });
    });
    test('6. Complete Booking with QR Ticket Generation', async () => {
        // Alice holds VIP seat A1
        const holdRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/shows/${showId}/hold`)
            .set('Authorization', `Bearer ${customer1Token}`)
            .send({ showSeatIds: [vipShowSeatId] });
        expect(holdRes.status).toBe(200);
        // Alice confirms booking
        const res = await (0, supertest_1.default)(app_1.default)
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
    });
    test('7. Hold Abandonment & Manual Release', async () => {
        // Alice holds Premium seat B1
        const holdRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/shows/${showId}/hold`)
            .set('Authorization', `Bearer ${customer1Token}`)
            .send({ showSeatIds: [premiumShowSeatId] });
        expect(holdRes.status).toBe(200);
        // Alice releases hold
        const releaseRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/shows/${showId}/release`)
            .set('Authorization', `Bearer ${customer1Token}`)
            .send({ showSeatIds: [premiumShowSeatId] });
        expect(releaseRes.status).toBe(200);
        expect(releaseRes.body.releasedCount).toBe(1);
        // Verify status is AVAILABLE again
        const mapRes = await (0, supertest_1.default)(app_1.default).get(`/api/shows/${showId}/seats`);
        const b1Seat = mapRes.body.seats.find((s) => s.showSeatId === premiumShowSeatId);
        expect(b1Seat.status).toBe('AVAILABLE');
    });
    test('8. Automated Waitlist Queue & Reallocation Flow on Cancellation', async () => {
        // Bob joins waitlist for VIP category (since A1 VIP seat is currently booked by Alice)
        const waitlistRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/waitlist/join')
            .set('Authorization', `Bearer ${customer2Token}`)
            .send({ showId, seatCategory: 'VIP' });
        expect(waitlistRes.status).toBe(201);
        expect(waitlistRes.body.queuePosition).toBe(1);
        // Alice cancels her booking for VIP Seat A1
        const myBookings = await (0, supertest_1.default)(app_1.default)
            .get('/api/bookings/my')
            .set('Authorization', `Bearer ${customer1Token}`);
        const activeBooking = myBookings.body.find((b) => b.status === 'CONFIRMED');
        expect(activeBooking).toBeDefined();
        const cancelRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/bookings/${activeBooking.id}/cancel`)
            .set('Authorization', `Bearer ${customer1Token}`);
        expect(cancelRes.status).toBe(200);
        // Verify Bob automatically received a pending Waitlist Offer!
        const bobsWaitlists = await (0, supertest_1.default)(app_1.default)
            .get('/api/waitlist/my')
            .set('Authorization', `Bearer ${customer2Token}`);
        expect(bobsWaitlists.body.length).toBe(1);
        const offer = bobsWaitlists.body[0].offers[0];
        expect(offer).toBeDefined();
        expect(offer.status).toBe('PENDING');
        // Bob claims the waitlist offer and converts it to a booking!
        const claimRes = await (0, supertest_1.default)(app_1.default)
            .post(`/api/waitlist/offers/${offer.id}/claim`)
            .set('Authorization', `Bearer ${customer2Token}`)
            .send({
            showId,
            showSeatId: offer.showSeatId,
        });
        expect(claimRes.status).toBe(200);
        expect(claimRes.body.bookingReference).toContain('TKT-');
    });
    test('9. Organiser Revenue Summary', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/organiser/analytics/summary')
            .set('Authorization', `Bearer ${organiserToken}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].totalRevenue).toBe(100); // Bob booked 1 VIP ticket for 100
    });
});
