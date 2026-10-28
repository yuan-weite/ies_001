import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

export function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function ensureLocalEnv(): void {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) {
    writeFileSync(path, readFileSync(resolve(process.cwd(), '.env.example'), 'utf8'));
    console.info('Created .env.local from .env.example');
  }
  const current = readFileSync(path, 'utf8');
  const match = current.match(/^AUTH_SECRET=(.*)$/m);
  const secret = match?.[1]?.trim() ?? '';
  if (secret.length < 32 || secret.startsWith('replace-with')) {
    const generated = randomBytes(32).toString('hex');
    const next = match
      ? current.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${generated}`)
      : `${current.replace(/\s*$/, '')}\nAUTH_SECRET=${generated}\n`;
    writeFileSync(path, next.endsWith('\n') ? next : `${next}\n`);
    console.info('Generated AUTH_SECRET in .env.local');
  }
  loadEnvFile(path);
}
