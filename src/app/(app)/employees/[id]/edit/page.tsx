import { notFound } from 'next/navigation';
import { EmployeeForm } from '@/components/employee-form';
import { findEmployeeById } from '@/lib/employees';
import { requireAdmin } from '@/lib/guards';
import { updateEmployeeAction } from './actions';

export const metadata = { title: '従業員の編集' };

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const employee = await findEmployeeById(id);
  if (!employee) notFound();

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>従業員の編集</h1>
          <p className="lede">メールアドレスを変えると、ログインIDも変わります。パスワードはここでは変更しません。</p>
        </div>
      </div>
      <section className="panel narrow">
        <EmployeeForm
          action={updateEmployeeAction.bind(null, employee.id)}
          submitLabel="保存する"
          defaults={{
            fullName: employee.fullName,
            email: employee.email,
            department: employee.department,
            companyType: employee.companyType,
          }}
        />
      </section>
    </main>
  );
}
