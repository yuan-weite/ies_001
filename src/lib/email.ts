import type { PoolClient } from 'pg';
import nodemailer from 'nodemailer';
import { pool } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import type { MailboxMessage } from '@/lib/types';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export function initialPasswordEmail(input: {
  fullName: string;
  email: string;
  password: string;
  loginUrl: string;
}): EmailMessage {
  return {
    to: input.email,
    subject: '【社内管理】初期パスワードのお知らせ',
    text: [
      `${input.fullName} 様`,
      '',
      '社内管理システムにアカウントを登録しました。',
      '下記の初期パスワードでログインしてください。',
      '',
      `ログインID（メールアドレス）: ${input.email}`,
      `初期パスワード: ${input.password}`,
      `ログインURL: ${input.loginUrl}`,
      '',
      '初回ログイン後、他の画面へ進む前にパスワードの変更が必要です。',
      '初期パスワードをこのメール以外で再表示することはありません。',
      '',
      '心当たりがない場合は、このメールを破棄してください。',
    ].join('\n'),
  };
}

export function resetPasswordEmail(input: {
  fullName: string;
  email: string;
  resetUrl: string;
  expiresAt: Date;
}): EmailMessage {
  return {
    to: input.email,
    subject: '【社内管理】パスワード再設定',
    text: [
      `${input.fullName} 様`,
      '',
      'パスワード再設定の依頼を受け付けました。',
      '次のURLを開き、新しいパスワードを設定してください。',
      'このURLは1回だけ使用できます。',
      '',
      input.resetUrl,
      '',
      `有効期限: ${formatDateTime(input.expiresAt)}（日本時間）`,
      '',
      '有効期限が切れたリンク、すでに使用したリンクは利用できません。',
      '心当たりがない場合は、このメールを破棄してください。',
    ].join('\n'),
  };
}

function logDelivery(transport: 'smtp' | 'dev_mailbox', message: EmailMessage) {
  console.info(
    JSON.stringify({
      event: 'email_delivered',
      transport,
      to: message.to,
      subject: message.subject,
    }),
  );
}

async function sendSmtp(message: EmailMessage): Promise<void> {
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: user
      ? {
          user,
          pass: process.env.SMTP_PASSWORD ?? '',
        }
      : undefined,
  });
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : 'unknown';
    console.error(JSON.stringify({ event: 'email_delivery_failed', transport: 'smtp', code }));
    throw new Error('SMTP delivery failed');
  }
}

export async function deliverEmail(message: EmailMessage, client?: PoolClient): Promise<void> {
  if (isSmtpConfigured()) {
    await sendSmtp(message);
    logDelivery('smtp', message);
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMTP is not configured');
  }
  const db = client ?? pool;
  await db.query('INSERT INTO dev_mailbox (recipient, subject, body) VALUES ($1, $2, $3)', [
    message.to,
    message.subject,
    message.text,
  ]);
  logDelivery('dev_mailbox', message);
}

export async function listDevMailbox(limit = 30): Promise<MailboxMessage[]> {
  const result = await pool.query<{
    id: string;
    recipient: string;
    subject: string;
    body: string;
    created_at: Date;
  }>(
    `SELECT id, recipient, subject, body, created_at
     FROM dev_mailbox
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,
  }));
}
