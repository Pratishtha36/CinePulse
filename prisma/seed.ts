import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default personas, venues, and events...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Default Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cinepulse.com' },
    update: { role: 'ADMIN', name: 'System Admin' },
    create: {
      email: 'admin@cinepulse.com',
      name: 'System Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const organiser = await prisma.user.upsert({
    where: { email: 'organiser@events.com' },
    update: { role: 'ORGANISER', name: 'Cinema Organiser' },
    create: {
      email: 'organiser@events.com',
      name: 'Cinema Organiser',
      passwordHash,
      role: 'ORGANISER',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'alice@gmail.com' },
    update: { role: 'CUSTOMER', name: 'Alice Customer' },
    create: {
      email: 'alice@gmail.com',
      name: 'Alice Customer',
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  console.log(`Users seeded: Admin (${admin.email}), Organiser (${organiser.email}), Customer (${customer.email})`);

  // 2. Seed Default Venue if none exists
  let venue = await prisma.venue.findFirst();
  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        name: 'Grand IMAX Auditorium',
        address: '742 Evergreen Terrace, Metropolis',
        totalRows: 6,
        totalCols: 10,
      },
    });

    const categories = ['VIP', 'PREMIUM', 'STANDARD'];
    const seatData = [];
    for (let r = 0; r < 6; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      const category = r < 2 ? 'VIP' : r < 4 ? 'PREMIUM' : 'STANDARD';
      for (let c = 1; c <= 10; c++) {
        seatData.push({
          venueId: venue.id,
          rowLabel,
          colNumber: c,
          category,
        });
      }
    }
    await prisma.seat.createMany({ data: seatData });
    console.log(`Venue seeded: ${venue.name} with 60 seats`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
