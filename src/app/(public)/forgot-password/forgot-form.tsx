'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import { forgotPasswordAction } from './actions';

export function ForgotForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, {});

  if (state.doneMessage) {
    return (
      <div>
        <p className="banner banner-ok" role="status">{state.doneMessage}</p>
        <p className="links"><a href="/login">ログインへ戻る</a></p>
      </div>
    );
  }

  return (
    <form action={formAction} className="form" noValidate>
      {state.error ? <p className="banner banner-error" role="alert">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>
      <SubmitButton label="再設定メールを送信" pendingLabel="送信中..." />
    </form>
  );
}
