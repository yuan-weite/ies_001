import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth-card';
import { getCurrentEmployee } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata = { title: 'ログイン' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const employee = await getCurrentEmployee();
  if (employee) redirect('/session/continue');
  const params = await searchParams;
  const notice = params.reset === '1'
    ? 'パスワードを変更しました。新しいパスワードでログインしてください。'
    : undefined;

  return (
    <AuthCard title="ログイン" description="メールアドレスがログインIDです。">
      <LoginForm notice={notice} />
      <div className="links">
        <a href="/forgot-password">パスワードを忘れた方</a>
        {process.env.NODE_ENV === 'development' ? <a href="/dev/emails">開発用メールを確認</a> : null}
      </div>
    </AuthCard>
  );
}
