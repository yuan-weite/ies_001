import type { Role } from '@/lib/types';

export function homePath(role: Role): '/employees' | '/home' {
  return role === 'admin' ? '/employees' : '/home';
}
