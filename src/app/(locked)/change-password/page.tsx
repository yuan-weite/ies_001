import { requirePasswordChangeUser } from '@/lib/guards';
import { ChangePasswordForm } from './change-form';

export const metadata = { title: 'パスワード変更' };

export default async function ChangePasswordPage() {
  await requirePasswordChangeUser();

  return (
    <main className="page">
      <section className="panel narrow">
        <h1>パスワードの変更</h1>
        <p className="lede">
          初回ログインのため、パスワードの変更が必要です。変更が終わるまで、他の画面は利用できません。
        </p>
        <ChangePasswordForm />
        <p className="fine">
          初期パスワードが分からない場合は、ログアウトしてからパスワード再設定を行ってください。
        </p>
      </section>
    </main>
  );
}
