'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import type { ActionState } from '@/lib/types';
import { loginAction } from './actions';

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="form" noValidate>
      {notice ? <p className="banner banner-ok">{notice}</p> : null}
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
      <div className="field">
        <label htmlFor="password">パスワード</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton label="ログイン" pendingLabel="確認中..." />
    </form>
  );
}
