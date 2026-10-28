import { AuthCard } from '@/components/auth-card';
import { ForgotForm } from './forgot-form';

export const metadata = { title: 'パスワード再設定' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="パスワード再設定"
      description="登録済みのメールアドレスへ、1回だけ使える再設定URLを送信します。"
    >
      <ForgotForm />
      <p className="links"><a href="/login">ログインへ戻る</a></p>
    </AuthCard>
  );
}
