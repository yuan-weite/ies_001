'use server';

import { redirect } from 'next/navigation';
import { authenticate } from '@/lib/employees';
import { homePath } from '@/lib/paths';
import { setSessionCookie } from '@/lib/session';
import type { ActionState } from '@/lib/types';

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!email.trim() || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }
  const employee = await authenticate(email, password);
  if (!employee) {
    return { error: 'メールアドレスまたはパスワードが正しくありません。' };
  }
  await setSessionCookie(employee);
  redirect(employee.mustChangePassword ? '/change-password' : homePath(employee.role));
}
