import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Try to connect to the database on startup to catch connection issues early
(async () => {
  try {
    await prisma.$connect();
    console.log('💾 Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Log the error but don't crash the app
  }
})(); 