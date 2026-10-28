'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import type { ActionState, CompanyType } from '@/lib/types';

type EmployeeAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function EmployeeForm({
  action,
  submitLabel,
  defaults,
}: {
  action: EmployeeAction;
  submitLabel: string;
  defaults?: {
    fullName: string;
    email: string;
    department: string;
    companyType: CompanyType;
  };
}) {
  const [state, formAction] = useActionState(action, {});
  const companyType = defaults?.companyType ?? 'own';

  return (
    <form action={formAction} className="form" noValidate>
      {state.error ? <p className="banner banner-error" role="alert">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="fullName">氏名</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          maxLength={80}
          defaultValue={defaults?.fullName ?? ''}
          aria-invalid={state.fieldErrors?.fullName ? true : undefined}
          aria-describedby={state.fieldErrors?.fullName ? 'fullName-error' : undefined}
          required
        />
        {state.fieldErrors?.fullName ? <p className="field-error" id="fullName-error">{state.fieldErrors.fullName}</p> : null}
      </div>
      <div className="field">
        <label htmlFor="email">メールアドレス</label>
        <p className="hint">ログインIDとして使います。</p>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          defaultValue={defaults?.email ?? ''}
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? 'email-error' : undefined}
          required
        />
        {state.fieldErrors?.email ? <p className="field-error" id="email-error">{state.fieldErrors.email}</p> : null}
      </div>
      <div className="field">
        <label htmlFor="department">所属</label>
        <input
          id="department"
          name="department"
          type="text"
          maxLength={80}
          defaultValue={defaults?.department ?? ''}
          aria-invalid={state.fieldErrors?.department ? true : undefined}
          aria-describedby={state.fieldErrors?.department ? 'department-error' : undefined}
          required
        />
        {state.fieldErrors?.department ? <p className="field-error" id="department-error">{state.fieldErrors.department}</p> : null}
      </div>
      <fieldset className="radios" aria-describedby={state.fieldErrors?.companyType ? 'companyType-error' : undefined}>
        <legend>会社</legend>
        <div className="radio-row">
          <label>
            <input type="radio" name="companyType" value="own" defaultChecked={companyType === 'own'} />
            自社
          </label>
          <label>
            <input type="radio" name="companyType" value="other" defaultChecked={companyType === 'other'} />
            他社
          </label>
        </div>
        {state.fieldErrors?.companyType ? <p className="field-error" id="companyType-error">{state.fieldErrors.companyType}</p> : null}
      </fieldset>
      <div className="form-actions">
        <SubmitButton label={submitLabel} pendingLabel="送信中..." />
        <a className="button button-secondary" href="/employees">一覧へ戻る</a>
      </div>
    </form>
  );
}
