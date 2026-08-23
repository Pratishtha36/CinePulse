"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganiserRevenueSummary = exports.getShowSeatMap = exports.getEvents = exports.createShow = exports.createEvent = void 0;
const prisma_1 = require("../config/prisma");
const createEvent = async (organiserId, data) => {
    return await prisma_1.prisma.event.create({
        data: {
            title: data.title,
            description: data.description,
            type: data.type.toUpperCase(),
            posterUrl: data.posterUrl || '',
            organiserId,
        },
    });
};
exports.createEvent = createEvent;
const createShow = async (organiserId, data) => {
    const event = await prisma_1.prisma.event.findUnique({ where: { id: data.eventId } });
    if (!event)
        throw { statusCode: 404, message: 'Event not found' };
    if (event.organiserId !== organiserId) {
        throw { statusCode: 403, message: 'Not authorized to add shows for this event' };
    }
    const venue = await prisma_1.prisma.venue.findUnique({
        where: { id: data.venueId },
        include: { seats: true },
    });
    if (!venue)
        throw { statusCode: 404, message: 'Venue not found' };
    if (!venue.seats || venue.seats.length === 0) {
        throw { statusCode: 400, message: 'Venue has no seats configured' };
    }
    const show = await prisma_1.prisma.show.create({
        data: {
            eventId: data.eventId,
            venueId: data.venueId,
            startTime: new Date(data.startTime),
            endTime: new Date(data.endTime),
            categoryPrices: JSON.stringify(data.categoryPrices),
        },
    });
    // Seed ShowSeat records for all seats in the venue
    const showSeatsData = venue.seats.map((seat) => ({
        showId: show.id,
        seatId: seat.id,
        status: 'AVAILABLE',
    }));
    await prisma_1.prisma.showSeat.createMany({
        data: showSeatsData,
    });
    return await prisma_1.prisma.show.findUnique({
        where: { id: show.id },
        include: { event: true, venue: true },
    });
};
exports.createShow = createShow;
const getEvents = async (filters) => {
    const where = {};
    if (filters?.search) {
        where.OR = [
            { title: { contains: filters.search } },
            { description: { contains: filters.search } },
        ];
    }
    if (filters?.type) {
        where.type = filters.type.toUpperCase();
    }
    return await prisma_1.prisma.event.findMany({
        where,
        include: {
            organiser: { select: { id: true, name: true, email: true } },
            shows: {
                include: { venue: true },
                orderBy: { startTime: 'asc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};
exports.getEvents = getEvents;
const getShowSeatMap = async (showId) => {
    const show = await prisma_1.prisma.show.findUnique({
        where: { id: showId },
        include: {
            event: true,
            venue: {
                include: { seats: true },
            },
            showSeats: {
                include: {
                    seat: true,
                    hold: {
                        select: { id: true, customerId: true, expiresAt: true, status: true },
                    },
                },
            },
        },
    });
    if (!show)
        throw { statusCode: 404, message: 'Show not found' };
    const categoryPrices = JSON.parse(show.categoryPrices || '{}');
    const now = new Date();
    // Map seats with status & price
    const formattedSeats = show.showSeats.map((ss) => {
        let effectiveStatus = ss.status;
        // Check if hold has expired
        if (ss.status === 'HELD' && ss.hold) {
            if (ss.hold.expiresAt <= now || ss.hold.status !== 'ACTIVE') {
                effectiveStatus = 'AVAILABLE';
            }
        }
        return {
            showSeatId: ss.id,
            seatId: ss.seat.id,
            rowLabel: ss.seat.rowLabel,
            colNumber: ss.seat.colNumber,
            category: ss.seat.category,
            price: categoryPrices[ss.seat.category] || 0,
            status: effectiveStatus,
            holdExpiresAt: ss.hold?.expiresAt || null,
            heldByMe: false, // will be enriched if customerId is passed
        };
    });
    return {
        showId: show.id,
        eventTitle: show.event.title,
        venueName: show.venue.name,
        totalRows: show.venue.totalRows,
        totalCols: show.venue.totalCols,
        startTime: show.startTime,
        categoryPrices,
        seats: formattedSeats,
    };
};
exports.getShowSeatMap = getShowSeatMap;
const getOrganiserRevenueSummary = async (organiserId) => {
    const events = await prisma_1.prisma.event.findMany({
        where: { organiserId },
        include: {
            shows: {
                include: {
                    bookings: {
                        where: { status: 'CONFIRMED' },
                    },
                    showSeats: true,
                    waitlistEntries: true,
                },
            },
        },
    });
    const summary = events.map((evt) => {
        let totalRevenue = 0;
        let totalTicketsBooked = 0;
        let totalSeats = 0;
        evt.shows.forEach((show) => {
            totalSeats += show.showSeats.length;
            show.bookings.forEach((b) => {
                totalRevenue += b.pricePaid;
                totalTicketsBooked += 1;
            });
        });
        return {
            eventId: evt.id,
            eventTitle: evt.title,
            type: evt.type,
            showsCount: evt.shows.length,
            totalSeats,
            totalTicketsBooked,
            occupancyRate: totalSeats > 0 ? (totalTicketsBooked / totalSeats) * 100 : 0,
            totalRevenue,
        };
    });
    return summary;
};
exports.getOrganiserRevenueSummary = getOrganiserRevenueSummary;
