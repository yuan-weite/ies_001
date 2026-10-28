import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from '@/lib/db';
import { hashPassword, validatePassword } from '@/lib/passwords';

async function waitForDatabase(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
  }
  throw new Error(
    'Cannot connect to PostgreSQL. Start the database and check DATABASE_URL.',
  );
}

export async function setupDatabase(options: { reset: boolean }): Promise<void> {
  await waitForDatabase();
  if (options.reset) {
    await pool.query(`
      DROP TABLE IF EXISTS dev_mailbox;
      DROP TABLE IF EXISTS password_reset_tokens;
      DROP TABLE IF EXISTS employees;
    `);
  }
  const schema = readFileSync(resolve(process.cwd(), 'db/schema.sql'), 'utf8');
  await pool.query(schema);
  await seedAdmin();
}

async function seedAdmin(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
  const existing = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
  if ((existing.rowCount ?? 0) > 0) {
    console.info(`Seed admin already exists: ${email}`);
    return;
  }
  const policyError = validatePassword(password);
  if (policyError) {
    throw new Error('SEED_ADMIN_PASSWORD does not meet the password policy');
  }
  const passwordHash = await hashPassword(password);
  await pool.query(
    `INSERT INTO employees
      (email, full_name, department, company_type, password_hash, must_change_password, role)
     VALUES ($1, '管理者', '管理', 'own', $2, true, 'admin')`,
    [email, passwordHash],
  );
  console.info(`Seeded admin: ${email}`);
}
