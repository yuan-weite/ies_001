import { logoutAction } from '@/app/actions/logout';
import type { Employee } from '@/lib/types';

export function Header({ employee, locked }: { employee: Employee; locked?: boolean }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        {locked ? <span className="brand">社内管理</span> : <a className="brand" href="/">社内管理</a>}
        {!locked && employee.role === 'admin' ? (
          <nav className="nav">
            <a href="/employees">従業員</a>
          </nav>
        ) : null}
        <div className="session">
          <span className="session-name">{employee.fullName}</span>
          <form action={logoutAction}>
            <button className="button button-ghost" type="submit">ログアウト</button>
          </form>
        </div>
      </div>
    </header>
  );
}
