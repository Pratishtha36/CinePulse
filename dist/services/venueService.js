"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVenueById = exports.getVenues = exports.deleteVenue = exports.updateVenue = exports.createVenue = exports.generateRowLabel = void 0;
const prisma_1 = require("../config/prisma");
// Helper to generate spreadsheet-style row labels: 0 -> A, 25 -> Z, 26 -> AA, 27 -> AB, etc.
const generateRowLabel = (index) => {
    let label = '';
    let num = index;
    while (num >= 0) {
        label = String.fromCharCode(65 + (num % 26)) + label;
        num = Math.floor(num / 26) - 1;
    }
    return label;
};
exports.generateRowLabel = generateRowLabel;
const createVenue = async (data) => {
    if (data.totalRows <= 0 || data.totalCols <= 0) {
        throw { statusCode: 400, message: 'totalRows and totalCols must be greater than 0' };
    }
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
        const rowLabel = (0, exports.generateRowLabel)(r);
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
const updateVenue = async (id, data) => {
    const existing = await prisma_1.prisma.venue.findUnique({ where: { id } });
    if (!existing) {
        throw { statusCode: 404, message: 'Venue not found' };
    }
    return await prisma_1.prisma.venue.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.address && { address: data.address }),
        },
        include: { seats: true },
    });
};
exports.updateVenue = updateVenue;
const deleteVenue = async (id) => {
    const existing = await prisma_1.prisma.venue.findUnique({
        where: { id },
        include: { shows: true },
    });
    if (!existing) {
        throw { statusCode: 404, message: 'Venue not found' };
    }
    if (existing.shows && existing.shows.length > 0) {
        throw {
            statusCode: 400,
            message: `Cannot delete venue '${existing.name}' because it has ${existing.shows.length} associated show(s).`,
        };
    }
    await prisma_1.prisma.venue.delete({ where: { id } });
    return { message: `Venue '${existing.name}' successfully deleted.` };
};
exports.deleteVenue = deleteVenue;
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
