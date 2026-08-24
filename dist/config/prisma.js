"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
// Configure SQLite for high concurrency (WAL mode and busy timeout)
if (process.env.DATABASE_URL?.includes('file:')) {
    exports.prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
        .then(() => exports.prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;'))
        .catch((err) => {
        console.warn('[PRISMA WARNING] Could not set SQLite PRAGMAs:', err.message);
    });
}
