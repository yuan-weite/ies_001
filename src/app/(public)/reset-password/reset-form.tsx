'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import type { ActionState } from '@/lib/types';
import { resetPasswordAction } from './actions';

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, {});

  return (
    <form action={formAction} className="form" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error ? <p className="banner banner-error" role="alert">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="newPassword">新しいパスワード</label>
        <p className="hint">8文字以上で、英字と数字を含めてください。</p>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">新しいパスワード（確認）</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      <SubmitButton label="パスワードを設定" pendingLabel="設定中..." />
    </form>
  );
}
