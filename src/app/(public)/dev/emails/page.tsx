import { notFound } from 'next/navigation';
import { listDevMailbox } from '@/lib/email';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: '開発用メール' };

export default async function DevEmailsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const messages = await listDevMailbox();

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>開発用メール</h1>
          <p className="lede">SMTP未設定の開発環境で送信したメールです。初期パスワードと再設定URLはここにだけ残ります。</p>
        </div>
        <a className="button button-secondary" href="/login">ログインへ</a>
      </div>
      <p className="banner banner-warn">この画面は開発サーバーだけで表示されます。本番では開きません。</p>
      {messages.length === 0 ? (
        <p className="empty">受信メールはありません。</p>
      ) : (
        <div className="mail-list">
          {messages.map((message) => (
            <article className="mail" key={message.id}>
              <div className="mail-meta">
                <div>日時: <strong>{formatDateTime(message.createdAt)}</strong></div>
                <div>宛先: <strong>{message.recipient}</strong></div>
                <div>件名: <strong>{message.subject}</strong></div>
              </div>
              <pre>{message.body}</pre>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
