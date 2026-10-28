'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import { changePasswordAction } from './actions';

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, {});

  return (
    <form action={formAction} className="form" noValidate>
      {state.error ? <p className="banner banner-error" role="alert">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="currentPassword">現在のパスワード</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        {state.fieldErrors?.currentPassword ? <p className="field-error">{state.fieldErrors.currentPassword}</p> : null}
      </div>
      <div className="field">
        <label htmlFor="newPassword">新しいパスワード</label>
        <p className="hint">8文字以上で、英字と数字を含めてください。</p>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
        {state.fieldErrors?.newPassword ? <p className="field-error">{state.fieldErrors.newPassword}</p> : null}
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">新しいパスワード（確認）</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        {state.fieldErrors?.confirmPassword ? <p className="field-error">{state.fieldErrors.confirmPassword}</p> : null}
      </div>
      <SubmitButton label="パスワードを変更" pendingLabel="変更中..." />
    </form>
  );
}
