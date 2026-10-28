import { Pool } from 'pg';

const globalForPg = globalThis as typeof globalThis & { iesPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
  });
}

export const pool = globalForPg.iesPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForPg.iesPool = pool;
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  );
}
