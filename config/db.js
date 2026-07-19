const { PrismaClient } = require('@prisma/client');

// Nodemon reloads server.js on every save, which would otherwise spin up a
// fresh PrismaClient (and a fresh connection pool) each time. Caching the
// instance on `global` in development keeps a single client across reloads.
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
