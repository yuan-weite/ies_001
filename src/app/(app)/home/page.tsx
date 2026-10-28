import { requireUser } from '@/lib/guards';

export const metadata = { title: 'ホーム' };

export default async function HomePage() {
  const employee = await requireUser();
  return (
    <main className="page">
      <section className="panel">
        <h1>ホーム</h1>
        <p className="lede">{employee.fullName} さんとしてログインしています。</p>
      </section>
    </main>
  );
}
