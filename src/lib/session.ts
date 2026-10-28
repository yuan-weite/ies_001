import { cookies } from 'next/headers';
import { findEmployeeById } from '@/lib/employees';
import {
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionClaims,
} from '@/lib/session-token';
import type { Employee } from '@/lib/types';

function cookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function setSessionCookie(employee: Employee): Promise<void> {
  const token = await signSessionToken({
    sub: employee.id,
    role: employee.role,
    mustChangePassword: employee.mustChangePassword,
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, cookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, '', cookieOptions(0));
}

export async function getSessionState(): Promise<
  { employee: null; claims: null } | { employee: Employee; claims: SessionClaims }
> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return { employee: null, claims: null };
  const claims = await verifySessionToken(token);
  if (!claims) return { employee: null, claims: null };
  const employee = await findEmployeeById(claims.sub);
  if (!employee) return { employee: null, claims: null };
  return { employee, claims };
}

export async function getCurrentEmployee(): Promise<Employee | null> {
  const state = await getSessionState();
  return state.employee;
}
