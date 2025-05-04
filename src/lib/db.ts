// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the PrismaClient instance
// This helps prevent creating multiple instances in development due to HMR
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Instantiate PrismaClient
// Use the global instance if it exists, otherwise create a new one
const prisma = global.prisma || new PrismaClient({
    // Optional: Enable logging for debugging specific queries
    // log: ['query', 'info', 'warn', 'error'],
});

// Assign the instance to the global variable in development environment
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Export the PrismaClient instance
export default prisma;

// No need for the pool connection test anymore, Prisma handles connections.
