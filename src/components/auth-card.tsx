import type { ReactNode } from 'react';

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-screen">
      <section className="card">
        <p className="eyebrow">社内管理</p>
        <h1>{title}</h1>
        {description ? <p className="lede">{description}</p> : null}
        {children}
      </section>
    </main>
  );
}
