import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

const BCRYPT_COST = 12;
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALL = `${UPPER}${LOWER}${DIGITS}`;

let dummyHash: Promise<string> | undefined;

export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 72 || Buffer.byteLength(password) > 72) {
    return 'パスワードは8文字以上72文字以内で入力してください。';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'パスワードは英字と数字の両方を含めてください。';
  }
  return null;
}

export function generateInitialPassword(): string {
  const bytes = randomBytes(16);
  const chars = [
    UPPER[bytes[0] % UPPER.length],
    LOWER[bytes[1] % LOWER.length],
    DIGITS[bytes[2] % DIGITS.length],
  ];
  for (let index = 3; index < 14; index += 1) {
    chars.push(ALL[bytes[index] % ALL.length]);
  }
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = bytes[index] % (index + 1);
    const current = chars[index];
    chars[index] = chars[swap];
    chars[swap] = current;
  }
  const password = chars.join('');
  if (validatePassword(password)) {
    throw new Error('Generated password did not meet policy');
  }
  return password;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await compare(password, passwordHash);
  } catch {
    return false;
  }
}

export async function dummyPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hash('not-a-real-password', BCRYPT_COST);
  await verifyPassword(password, await dummyHash);
}
