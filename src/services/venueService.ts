import { prisma } from '../config/prisma';

// Helper to generate spreadsheet-style row labels: 0 -> A, 25 -> Z, 26 -> AA, 27 -> AB, etc.
export const generateRowLabel = (index: number): string => {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

export const createVenue = async (data: {
  name: string;
  address: string;
  totalRows: number;
  totalCols: number;
  categoryRules?: Record<string, string>; // e.g. { "A": "VIP", "B": "PREMIUM" }, default fallback "STANDARD"
}) => {
  if (data.totalRows <= 0 || data.totalCols <= 0) {
    throw { statusCode: 400, message: 'totalRows and totalCols must be greater than 0' };
  }

  const venue = await prisma.venue.create({
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
    const rowLabel = generateRowLabel(r);
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

  await prisma.seat.createMany({
    data: seatsToCreate,
  });

  const createdVenue = await prisma.venue.findUnique({
    where: { id: venue.id },
    include: { seats: true },
  });

  return createdVenue;
};

export const updateVenue = async (
  id: string,
  data: { name?: string; address?: string }
) => {
  const existing = await prisma.venue.findUnique({ where: { id } });
  if (!existing) {
    throw { statusCode: 404, message: 'Venue not found' };
  }

  return await prisma.venue.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.address && { address: data.address }),
    },
    include: { seats: true },
  });
};

export const deleteVenue = async (id: string) => {
  const existing = await prisma.venue.findUnique({
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

  await prisma.venue.delete({ where: { id } });
  return { message: `Venue '${existing.name}' successfully deleted.` };
};

export const getVenues = async () => {
  return await prisma.venue.findMany({
    include: {
      _count: {
        select: { seats: true, shows: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getVenueById = async (id: string) => {
  const venue = await prisma.venue.findUnique({
    where: { id },
    include: { seats: true },
  });
  if (!venue) {
    throw { statusCode: 404, message: 'Venue not found' };
  }
  return venue;
};

