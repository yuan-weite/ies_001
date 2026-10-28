import { ensureLocalEnv } from './env';

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Setup failed';
  const url = process.env.DATABASE_URL;
  return url ? message.split(url).join('[redacted]') : message;
}

async function main(): Promise<void> {
  ensureLocalEnv();
  const reset = process.argv.includes('--reset');
  const { setupDatabase } = await import('../src/lib/setup-database');
  const { pool } = await import('../src/lib/db');
  try {
    await setupDatabase({ reset });
    console.info(reset ? 'Database reset and seeded.' : 'Database is ready.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(safeMessage(error));
  process.exit(1);
});
