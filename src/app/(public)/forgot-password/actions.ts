'use server';

import { requestPasswordReset } from '@/lib/reset-tokens';
import type { ActionState } from '@/lib/types';

const SENT = '送信しました。メールアドレスが登録されている場合、再設定用のURLを記載したメールを送信しました。';

export async function forgotPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const result = await requestPasswordReset(email);
  if (!result.ok) return { error: result.error };
  return { doneMessage: SENT };
}
