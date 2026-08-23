import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Configure SQLite for high concurrency (WAL mode and busy timeout)
if (process.env.DATABASE_URL?.includes('file:')) {
  prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;'))
    .catch((err) => {
      console.warn('[PRISMA WARNING] Could not set SQLite PRAGMAs:', err.message);
    });
}

