import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test BEFORE anything else
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Extend timeout for DB operations
jest.setTimeout(30000);

// Global test Prisma client
export const testPrisma = new PrismaClient();

beforeAll(async () => {
  // Verify we're actually using the test database
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('pos_db_test')) {
    throw new Error(
      `🚨 SAFETY: Tests must run against pos_db_test, but got: ${dbUrl}`
    );
  }
  await testPrisma.$connect();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
