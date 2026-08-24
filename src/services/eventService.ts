import { prisma } from '../config/prisma';

export const createEvent = async (
  organiserId: string,
  data: {
    title: string;
    description: string;
    type: string; // MOVIE, CONCERT
    posterUrl?: string;
  }
) => {
  const user = await prisma.user.findUnique({ where: { id: organiserId } });
  if (!user) {
    throw { statusCode: 401, message: 'User session has expired or user account not found. Please log in again.' };
  }

  return await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type.toUpperCase(),
      posterUrl: data.posterUrl || '',
      organiserId,
    },
  });
};

export const createShow = async (
  organiserId: string,
  data: {
    eventId: string;
    venueId: string;
    startTime: string;
    endTime: string;
    categoryPrices: Record<string, number>; // e.g. { "VIP": 50, "PREMIUM": 35, "STANDARD": 20 }
  }
) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw { statusCode: 400, message: 'Invalid startTime or endTime format' };
  }

  if (start >= end) {
    throw { statusCode: 400, message: 'startTime must be before endTime' };
  }

  const event = await prisma.event.findUnique({ where: { id: data.eventId } });
  if (!event) throw { statusCode: 404, message: 'Event not found' };
  if (event.organiserId !== organiserId) {
    throw { statusCode: 403, message: 'Not authorized to add shows for this event' };
  }

  const venue = await prisma.venue.findUnique({
    where: { id: data.venueId },
    include: { seats: true },
  });
  if (!venue) throw { statusCode: 404, message: 'Venue not found' };

  if (!venue.seats || venue.seats.length === 0) {
    throw { statusCode: 400, message: 'Venue has no seats configured' };
  }

  // Check venue scheduling collision / overlap
  const overlappingShow = await prisma.show.findFirst({
    where: {
      venueId: data.venueId,
      OR: [
        { startTime: { lte: start }, endTime: { gt: start } },
        { startTime: { lt: end }, endTime: { gte: end } },
        { startTime: { gte: start }, endTime: { lte: end } },
      ],
    },
  });

  if (overlappingShow) {
    throw {
      statusCode: 409,
      message: 'Venue is already booked for another show during this time slot.',
    };
  }

  // Validate that all venue categories have pricing specified
  const venueCategories = Array.from(new Set(venue.seats.map((s) => s.category)));
  for (const cat of venueCategories) {
    if (data.categoryPrices[cat] === undefined || data.categoryPrices[cat] < 0) {
      throw {
        statusCode: 400,
        message: `Pricing for category '${cat}' is required and must be non-negative`,
      };
    }
  }

  const show = await prisma.show.create({
    data: {
      eventId: data.eventId,
      venueId: data.venueId,
      startTime: start,
      endTime: end,
      categoryPrices: JSON.stringify(data.categoryPrices),
    },
  });

  // Seed ShowSeat records for all seats in the venue
  const showSeatsData = venue.seats.map((seat) => ({
    showId: show.id,
    seatId: seat.id,
    status: 'AVAILABLE',
  }));

  await prisma.showSeat.createMany({
    data: showSeatsData,
  });

  return await prisma.show.findUnique({
    where: { id: show.id },
    include: { event: true, venue: true },
  });
};

export const getEvents = async (filters?: { search?: string; type?: string; venueId?: string; date?: string }) => {
  const where: any = {};
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }
  if (filters?.type) {
    where.type = filters.type.toUpperCase();
  }
  if (filters?.venueId) {
    where.shows = { some: { venueId: filters.venueId } };
  }
  if (filters?.date) {
    const targetDate = new Date(filters.date);
    if (!isNaN(targetDate.getTime())) {
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.shows = {
        some: {
          startTime: {
            gte: targetDate,
            lt: nextDay,
          },
        },
      };
    }
  }

  return await prisma.event.findMany({
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

export const getEventById = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organiser: { select: { id: true, name: true, email: true } },
      shows: {
        include: { venue: true },
        orderBy: { startTime: 'asc' },
      },
    },
  });
  if (!event) throw { statusCode: 404, message: 'Event not found' };
  return event;
};

export const getShowSeatMap = async (showId: string, currentUserId?: string) => {
  const show = await prisma.show.findUnique({
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
          waitlistOffers: {
            where: { status: 'PENDING' },
            include: { waitlistEntry: true },
          },
        },
      },
    },
  });

  if (!show) throw { statusCode: 404, message: 'Show not found' };

  const categoryPrices: Record<string, number> = JSON.parse(show.categoryPrices || '{}');
  const now = new Date();

  const categoryStats: Record<string, { total: number; available: number; isSoldOut: boolean }> = {};

  // Map seats with status & price
  const formattedSeats = show.showSeats.map((ss) => {
    let effectiveStatus = ss.status;
    const category = ss.seat.category;

    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, available: 0, isSoldOut: false };
    }
    categoryStats[category].total += 1;

    // Check if normal hold has expired
    if (ss.status === 'HELD' && ss.hold) {
      if (ss.hold.expiresAt <= now || ss.hold.status !== 'ACTIVE') {
        effectiveStatus = 'AVAILABLE';
      }
    }

    // Check if waitlist offer expired
    const activeOffer = ss.waitlistOffers && ss.waitlistOffers[0];
    if (ss.status === 'HELD' && !ss.hold && activeOffer) {
      if (activeOffer.offerExpiresAt <= now) {
        effectiveStatus = 'AVAILABLE';
      }
    }

    if (effectiveStatus === 'AVAILABLE') {
      categoryStats[category].available += 1;
    }

    // Determine if the current requesting user holds this seat
    let heldByMe = false;
    let holdExpiresAt: Date | null = null;

    if (effectiveStatus === 'HELD' && currentUserId) {
      if (ss.hold && ss.hold.status === 'ACTIVE' && ss.hold.expiresAt > now && ss.hold.customerId === currentUserId) {
        heldByMe = true;
        holdExpiresAt = ss.hold.expiresAt;
      } else if (activeOffer && activeOffer.offerExpiresAt > now && activeOffer.waitlistEntry.customerId === currentUserId) {
        heldByMe = true;
        holdExpiresAt = activeOffer.offerExpiresAt;
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
      holdExpiresAt,
      heldByMe,
    };
  });

  // Calculate sold-out status per category
  for (const cat in categoryStats) {
    categoryStats[cat].isSoldOut = categoryStats[cat].available === 0;
  }

  const isSoldOut = Object.values(categoryStats).every((stats) => stats.isSoldOut);

  return {
    showId: show.id,
    eventTitle: show.event.title,
    venueName: show.venue.name,
    totalRows: show.venue.totalRows,
    totalCols: show.venue.totalCols,
    startTime: show.startTime,
    categoryPrices,
    isSoldOut,
    categoryStats,
    seats: formattedSeats,
  };
};

export const getOrganiserRevenueSummary = async (organiserId: string) => {
  const events = await prisma.event.findMany({
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

