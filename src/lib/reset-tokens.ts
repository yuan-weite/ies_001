import { createHash, randomBytes } from 'node:crypto';
import { pool } from '@/lib/db';
import { deliverEmail, isSmtpConfigured, resetPasswordEmail } from '@/lib/email';
import { findEmployeeByEmail } from '@/lib/employees';
import { appBaseUrl } from '@/lib/format';
import { hashPassword, validatePassword, verifyPassword } from '@/lib/passwords';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResetTokenStatus =
  | { status: 'valid' }
  | { status: 'invalid' }
  | { status: 'used' }
  | { status: 'expired' };

export function resetErrorMessage(status: Exclude<ResetTokenStatus['status'], 'valid'>): string {
  if (status === 'used') {
    return 'このリンクはすでに使用されています。パスワード再設定を最初からやり直してください。';
  }
  if (status === 'expired') {
    return 'このリンクの有効期限が切れています。パスワード再設定を最初からやり直してください。';
  }
  return 'このリンクは無効です。パスワード再設定を最初からやり直してください。';
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function resetTokenTtlMs(): number {
  const minutes = Number(process.env.RESET_TOKEN_TTL_MINUTES ?? '60');
  if (!Number.isFinite(minutes) || minutes <= 0) return 60 * 60 * 1000;
  return minutes * 60 * 1000;
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function requestPasswordReset(
  emailRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'メールアドレスの形式が正しくありません。' };
  }

  const employee = await findEmployeeByEmail(email);
  if (!employee) return { ok: true };

  if (process.env.NODE_ENV === 'production' && !isSmtpConfigured()) {
    return { ok: false, error: 'メール送信が設定されていないため、再設定メールを送れません。' };
  }

  const token = generateToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + resetTokenTtlMs());
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM password_reset_tokens
       WHERE employee_id = $1 AND used_at IS NULL AND expires_at > now()`,
      [employee.id],
    );
    await client.query(
      `INSERT INTO password_reset_tokens (employee_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [employee.id, tokenHash, expiresAt],
    );
    const message = resetPasswordEmail({
      fullName: employee.fullName,
      email: employee.email,
      resetUrl: `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`,
      expiresAt,
    });
    if (!isSmtpConfigured()) {
      await deliverEmail(message, client);
      await client.query('COMMIT');
      committed = true;
      return { ok: true };
    }
    await client.query('COMMIT');
    committed = true;
    try {
      await deliverEmail(message);
    } catch {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      return { ok: false, error: 'メールを送信できませんでした。時間をおいて再度お試しください。' };
    }
    return { ok: true };
  } catch {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The transaction is already closed.
      }
    }
    console.error(JSON.stringify({ event: 'password_reset_request_failed' }));
    return { ok: false, error: '送信に失敗しました。時間をおいて再度お試しください。' };
  } finally {
    client.release();
  }
}

type TokenRow = {
  id: string;
  employee_id: string;
  used_at: Date | null;
  expires_at: Date;
  password_hash: string;
};

async function lockToken(token: string, client: import('pg').PoolClient): Promise<TokenRow | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const result = await client.query<TokenRow>(
    `SELECT t.id, t.employee_id, t.used_at, t.expires_at, e.password_hash
     FROM password_reset_tokens t
     JOIN employees e ON e.id = t.employee_id
     WHERE t.token_hash = $1
     FOR UPDATE`,
    [hashResetToken(token)],
  );
  return result.rowCount === 1 ? result.rows[0] : null;
}

function statusOf(row: TokenRow | null): ResetTokenStatus {
  if (!row) return { status: 'invalid' };
  if (row.used_at) return { status: 'used' };
  if (row.expires_at.getTime() <= Date.now()) return { status: 'expired' };
  return { status: 'valid' };
}

export async function inspectResetToken(token: string): Promise<ResetTokenStatus> {
  if (!token || token.length < 20 || token.length > 200) return { status: 'invalid' };
  const result = await pool.query<{ used_at: Date | null; expires_at: Date }>(
    'SELECT used_at, expires_at FROM password_reset_tokens WHERE token_hash = $1',
    [hashResetToken(token)],
  );
  if (result.rowCount !== 1) return { status: 'invalid' };
  const row = result.rows[0];
  if (row.used_at) return { status: 'used' };
  if (row.expires_at.getTime() <= Date.now()) return { status: 'expired' };
  return { status: 'valid' };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ ok: true } | { ok: false; error: string; status: Exclude<ResetTokenStatus['status'], 'valid'> }> {
  if (newPassword !== confirmPassword) {
    return { ok: false, status: 'invalid', error: '確認用のパスワードが一致しません。' };
  }
  const policyError = validatePassword(newPassword);
  if (policyError) {
    return { ok: false, status: 'invalid', error: policyError };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await lockToken(token, client);
    const status = statusOf(row);
    if (status.status !== 'valid' || !row) {
      await client.query('ROLLBACK');
      const failure = status.status === 'valid' ? 'invalid' : status.status;
      return { ok: false, status: failure, error: resetErrorMessage(failure) };
    }
    if (await verifyPassword(newPassword, row.password_hash)) {
      await client.query('ROLLBACK');
      return {
        ok: false,
        status: 'invalid',
        error: '現在のパスワードとは別のパスワードにしてください。',
      };
    }
    const passwordHash = await hashPassword(newPassword);
    await client.query(
      `UPDATE employees
       SET password_hash = $2, must_change_password = false, updated_at = now()
       WHERE id = $1`,
      [row.employee_id, passwordHash],
    );
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = now()
       WHERE employee_id = $1 AND used_at IS NULL AND (id = $2 OR expires_at > now())`,
      [row.employee_id, row.id],
    );
    await client.query('COMMIT');
    return { ok: true };
  } catch {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The transaction is already closed.
    }
    console.error(JSON.stringify({ event: 'password_reset_failed' }));
    return { ok: false, status: 'invalid', error: 'パスワードを変更できませんでした。時間をおいて再度お試しください。' };
  } finally {
    client.release();
  }
}
