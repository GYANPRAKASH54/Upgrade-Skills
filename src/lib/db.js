import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = global;

// Reset global Prisma client in development to pick up newly pushed schema fields (e.g. status)
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
  try {
    globalForPrisma.prisma.$disconnect();
  } catch (e) {}
  globalForPrisma.prisma = null;
}

const getPrismaClient = () => {
  // Use absolute path for dev.db to avoid path resolving issues in Next.js build vs dev mode
  const dbPath = 'file:' + path.resolve(process.cwd(), 'prisma/dev.db');
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
