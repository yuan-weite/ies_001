import { AuthCard } from '@/components/auth-card';

export default function NotFound() {
  return (
    <AuthCard title="ページが見つかりません" description="アドレスを確認するか、ログインからやり直してください。">
      <p className="links"><a href="/login">ログインへ</a></p>
    </AuthCard>
  );
}
