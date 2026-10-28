import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@/lib/types';

export const COOKIE_NAME = 'ies_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionClaims = {
  sub: string;
  role: Role;
  mustChangePassword: boolean;
};

function authSecret() {
  const secret = process.env.AUTH_SECRET ?? '';
  if (secret.length < 32 || secret.startsWith('replace-with')) {
    throw new Error('AUTH_SECRET must be a random string of at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({
    role: claims.role,
    mustChangePassword: claims.mustChangePassword,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(authSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (typeof payload.sub !== 'string') return null;
    if (payload.role !== 'admin' && payload.role !== 'employee') return null;
    return {
      sub: payload.sub,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword === true,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('AUTH_SECRET')) {
      throw error;
    }
    return null;
  }
}
