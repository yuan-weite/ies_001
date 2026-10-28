import { AuthCard } from '@/components/auth-card';
import { inspectResetToken, resetErrorMessage } from '@/lib/reset-tokens';
import { ResetForm } from './reset-form';

export const metadata = { title: 'パスワード再設定' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? '';
  const status = await inspectResetToken(token);

  if (status.status !== 'valid') {
    return (
      <AuthCard title="パスワード再設定" description={resetErrorMessage(status.status)}>
        <p className="links"><a href="/forgot-password">再設定メールを再送する</a></p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="新しいパスワード" description="このページのリンクは、設定が終わると使えなくなります。">
      <ResetForm token={token} />
    </AuthCard>
  );
}
