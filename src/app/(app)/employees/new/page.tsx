import { EmployeeForm } from '@/components/employee-form';
import { requireAdmin } from '@/lib/guards';
import { createEmployeeAction } from './actions';

export const metadata = { title: '従業員の登録' };

export default async function NewEmployeePage() {
  await requireAdmin();
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>従業員の登録</h1>
          <p className="lede">初期パスワードはメールでのみ通知し、この画面には表示しません。</p>
        </div>
      </div>
      <section className="panel narrow">
        <EmployeeForm action={createEmployeeAction} submitLabel="登録する" />
      </section>
    </main>
  );
}
