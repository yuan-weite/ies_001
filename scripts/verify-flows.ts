import { ensureLocalEnv } from './env';

type MailRow = { subject: string; body: string };

function fail(message: string): never {
  throw new Error(message);
}

function extractLine(body: string, label: string): string {
  const line = body.split('\n').find((item) => item.startsWith(label));
  if (!line) fail(`email is missing ${label}`);
  return line.slice(label.length).trim();
}

function extractToken(body: string): string {
  const match = body.match(/\/reset-password\?token=([A-Za-z0-9_-]+)/);
  if (!match) fail('reset email is missing a single-use URL');
  return match[1];
}

async function main(): Promise<void> {
  ensureLocalEnv();

  const captured: string[] = [];
  const secrets: string[] = [];
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const original = Object.fromEntries(methods.map((method) => [method, console[method].bind(console)])) as Record<
    (typeof methods)[number],
    (...args: unknown[]) => void
  >;

  const assertLogsClean = () => {
    for (const line of captured) {
      if (secrets.some((secret) => secret.length > 0 && line.includes(secret))) {
        fail('application log contained a password or reset token');
      }
    }
  };

  const { pool } = await import('../src/lib/db');
  const {
    authenticate,
    changeOwnPassword,
    findEmployeeByEmail,
    listEmployees,
    registerEmployee,
    updateEmployee,
  } = await import('../src/lib/employees');
  const { hashResetToken, inspectResetToken, requestPasswordReset, resetPasswordWithToken } = await import(
    '../src/lib/reset-tokens'
  );

  const email = `flow.${Date.now()}@example.com`;
  const unknown = `missing.${Date.now()}@example.com`;

  for (const method of methods) {
    console[method] = (...args: unknown[]) => {
      captured.push(args.map((arg) => String(arg)).join(' '));
    };
  }

  try {
    const created = await registerEmployee({
      fullName: '検証 太郎',
      email,
      department: '開発部',
      companyType: 'other',
    });
    if (!created.ok) fail('registration failed');
    if ('password' in created || JSON.stringify(created).includes('初期パスワード')) {
      fail('registration result exposed the initial password');
    }

    const mail = await pool.query<MailRow>(
      `SELECT subject, body FROM dev_mailbox WHERE recipient = $1 ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    if (mail.rowCount !== 1) fail('initial password email was not captured');
    const initial = mail.rows[0];
    if (initial.subject !== '【社内管理】初期パスワードのお知らせ') fail('unexpected initial password subject');
    if (!initial.body.includes('初回ログイン') || !initial.body.includes('/login')) {
      fail('initial password email is missing login instructions');
    }
    const initialPassword = extractLine(initial.body, '初期パスワード:');
    secrets.push(initialPassword);

    const stored = await pool.query<{ password_hash: string; must_change_password: boolean }>(
      'SELECT password_hash, must_change_password FROM employees WHERE email = $1',
      [email],
    );
    if (stored.rowCount !== 1) fail('employee row missing');
    if (stored.rows[0].password_hash === initialPassword || !stored.rows[0].password_hash.startsWith('$2')) {
      fail('password was not stored as a hash');
    }
    if (!stored.rows[0].must_change_password) fail('new employee was not required to change password');

    const listed = JSON.stringify(await listEmployees());
    if (listed.includes(initialPassword) || listed.includes('password_hash') || listed.includes(stored.rows[0].password_hash)) {
      fail('employee list exposed password material');
    }

    const firstLogin = await authenticate(email, initialPassword);
    if (!firstLogin?.mustChangePassword) fail('first login did not require a password change');
    if (await authenticate(email, 'wrong-password-1')) fail('wrong password was accepted');

    const same = await changeOwnPassword(firstLogin.id, initialPassword, initialPassword, initialPassword);
    if (same.ok) fail('password change accepted the current password');

    const changed = await changeOwnPassword(firstLogin.id, initialPassword, 'Newpass123', 'Newpass123');
    if (!changed.ok) fail('password change failed');
    secrets.push('Newpass123');
    if (await authenticate(email, initialPassword)) fail('initial password still works');
    const afterChange = await authenticate(email, 'Newpass123');
    if (!afterChange || afterChange.mustChangePassword) fail('login after change did not clear the forced change');

    const hashBeforeEdit = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM employees WHERE email = $1',
      [email],
    );
    const updated = await updateEmployee(afterChange.id, {
      fullName: '検証 次郎',
      email,
      department: '企画部',
      companyType: 'own',
    });
    if (!updated.ok) fail('employee edit failed');
    const edited = await findEmployeeByEmail(email);
    if (edited?.fullName !== '検証 次郎' || edited.department !== '企画部' || edited.companyType !== 'own') {
      fail('employee edit did not persist');
    }
    const hashAfterEdit = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM employees WHERE email = $1',
      [email],
    );
    if (hashAfterEdit.rows[0].password_hash !== hashBeforeEdit.rows[0].password_hash) {
      fail('edit changed the password hash');
    }
    if (hashAfterEdit.rows[0].password_hash === initialPassword) fail('edit stored a plaintext password');

    const duplicate = await registerEmployee({
      fullName: '検証 重複',
      email,
      department: '開発部',
      companyType: 'own',
    });
    if (duplicate.ok) fail('duplicate email was accepted');

    const beforeUnknown = await pool.query('SELECT count(*)::int AS count FROM dev_mailbox WHERE recipient = $1', [unknown]);
    const unknownReset = await requestPasswordReset(unknown);
    if (!unknownReset.ok) fail('unknown address should still return a generic success');
    const afterUnknown = await pool.query('SELECT count(*)::int AS count FROM dev_mailbox WHERE recipient = $1', [unknown]);
    if (afterUnknown.rows[0].count !== beforeUnknown.rows[0].count) fail('reset email was sent to an unknown address');

    const requested = await requestPasswordReset(email);
    if (!requested.ok) fail('reset request failed');
    const resetMail = await pool.query<MailRow>(
      `SELECT subject, body FROM dev_mailbox WHERE recipient = $1 AND subject = '【社内管理】パスワード再設定' ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    if (resetMail.rowCount !== 1) fail('reset email was not captured');
    const token = extractToken(resetMail.rows[0].body);
    secrets.push(token);
    if ((resetMail.rows[0].body.match(/\/reset-password\?token=/g) ?? []).length !== 1) {
      fail('reset email did not contain exactly one reset URL');
    }
    const tokenRow = await pool.query<{ token_hash: string }>(
      'SELECT token_hash FROM password_reset_tokens WHERE token_hash = $1',
      [hashResetToken(token)],
    );
    if (tokenRow.rowCount !== 1 || tokenRow.rows[0].token_hash === token) {
      fail('reset token was not stored as a hash');
    }

    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute' WHERE token_hash = $1`,
      [hashResetToken(token)],
    );
    if ((await inspectResetToken(token)).status !== 'expired') fail('expired token was not reported as expired');
    const expired = await resetPasswordWithToken(token, 'Expired123', 'Expired123');
    if (expired.ok) fail('expired token was accepted');
    if (expired.status !== 'expired') fail('expired token was accepted');

    const requestedAgain = await requestPasswordReset(email);
    if (!requestedAgain.ok) fail('second reset request failed');
    const secondMail = await pool.query<MailRow>(
      `SELECT body FROM dev_mailbox WHERE recipient = $1 AND subject = '【社内管理】パスワード再設定' ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    const freshToken = extractToken(secondMail.rows[0].body);
    secrets.push(freshToken);
    if ((await inspectResetToken(freshToken)).status !== 'valid') fail('new reset link was not valid');
    const reset = await resetPasswordWithToken(freshToken, 'Resetpass123', 'Resetpass123');
    if (!reset.ok) fail('reset via link failed');
    secrets.push('Resetpass123');
    const reused = await resetPasswordWithToken(freshToken, 'Resetpass456', 'Resetpass456');
    if (reused.ok) fail('reused reset link was accepted');
    if (reused.status !== 'used') fail('reused reset link was accepted');
    if ((await inspectResetToken(token)).status !== 'expired') fail('old expired link changed status');

    const afterReset = await authenticate(email, 'Resetpass123');
    if (!afterReset || afterReset.mustChangePassword) fail('login after reset still required a forced change');
    if (await authenticate(email, 'Newpass123')) fail('password from before the reset still works');

    assertLogsClean();
    original.info('verify: ok');
  } finally {
    for (const method of methods) console[method] = original[method];
    try {
      await pool.query('DELETE FROM dev_mailbox WHERE recipient = ANY($1)', [[email, unknown]]);
      await pool.query('DELETE FROM employees WHERE email = $1', [email]);
    } catch {
      // The schema may not exist yet. The connection error is reported below.
    }
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'verify failed';
  console.error(message);
  process.exit(1);
});
