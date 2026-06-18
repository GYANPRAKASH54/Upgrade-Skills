import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const globalForPrisma = global;

const getPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 20 : 4, // Prevents connection limit exhaustion while maintaining performance under load
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout to 10s to handle concurrent traffic spikes safely
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
