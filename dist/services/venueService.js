"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVenueById = exports.getVenues = exports.createVenue = void 0;
const prisma_1 = require("../config/prisma");
const createVenue = async (data) => {
    if (data.totalRows <= 0 || data.totalCols <= 0) {
        throw { statusCode: 400, message: 'totalRows and totalCols must be greater than 0' };
    }
    // Row labels generator: 0 -> A, 1 -> B, ... 25 -> Z
    const getRowLabel = (index) => String.fromCharCode(65 + index);
    const venue = await prisma_1.prisma.venue.create({
        data: {
            name: data.name,
            address: data.address,
            totalRows: data.totalRows,
            totalCols: data.totalCols,
        },
    });
    const seatsToCreate = [];
    const categoryRules = data.categoryRules || {};
    for (let r = 0; r < data.totalRows; r++) {
        const rowLabel = getRowLabel(r);
        const category = categoryRules[rowLabel] || (r === 0 ? 'VIP' : r < 3 ? 'PREMIUM' : 'STANDARD');
        for (let c = 1; c <= data.totalCols; c++) {
            seatsToCreate.push({
                venueId: venue.id,
                rowLabel,
                colNumber: c,
                category,
            });
        }
    }
    await prisma_1.prisma.seat.createMany({
        data: seatsToCreate,
    });
    const createdVenue = await prisma_1.prisma.venue.findUnique({
        where: { id: venue.id },
        include: { seats: true },
    });
    return createdVenue;
};
exports.createVenue = createVenue;
const getVenues = async () => {
    return await prisma_1.prisma.venue.findMany({
        include: {
            _count: {
                select: { seats: true, shows: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};
exports.getVenues = getVenues;
const getVenueById = async (id) => {
    const venue = await prisma_1.prisma.venue.findUnique({
        where: { id },
        include: { seats: true },
    });
    if (!venue) {
        throw { statusCode: 404, message: 'Venue not found' };
    }
    return venue;
};
exports.getVenueById = getVenueById;
