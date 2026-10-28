import { companyLabel, formatDateTime } from '@/lib/format';
import { requireAdmin } from '@/lib/guards';
import { listEmployees } from '@/lib/employees';

export const metadata = { title: '従業員' };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; updated?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const employees = await listEmployees();

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>従業員</h1>
          <p className="lede">メールアドレスをログインIDとして管理します。</p>
        </div>
        <a className="button" href="/employees/new">新規登録</a>
      </div>
      {params.registered === '1' ? (
        <p className="banner banner-ok" role="status">登録しました。初期パスワードを記載したメールを送信しました。</p>
      ) : null}
      {params.updated === '1' ? (
        <p className="banner banner-ok" role="status">保存しました。</p>
      ) : null}
      <div className="table-wrap">
        {employees.length === 0 ? (
          <p className="empty">従業員は登録されていません。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>氏名</th>
                <th>メールアドレス</th>
                <th>所属</th>
                <th>会社</th>
                <th>登録日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.fullName}</td>
                  <td>{employee.email}</td>
                  <td>{employee.department}</td>
                  <td>{companyLabel(employee.companyType)}</td>
                  <td>{formatDateTime(employee.createdAt)}</td>
                  <td><a href={`/employees/${employee.id}/edit`}>編集</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
