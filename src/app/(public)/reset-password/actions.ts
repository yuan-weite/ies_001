'use server';

import { redirect } from 'next/navigation';
import { resetPasswordWithToken } from '@/lib/reset-tokens';
import type { ActionState } from '@/lib/types';

export async function resetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get('token') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const result = await resetPasswordWithToken(token, newPassword, confirmPassword);
  if (!result.ok) return { error: result.error };
  redirect('/login?reset=1');
}
