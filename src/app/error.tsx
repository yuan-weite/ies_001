'use client';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="auth-screen">
      <section className="card">
        <p className="eyebrow">社内管理</p>
        <h1>エラーが発生しました</h1>
        <p className="lede">時間をおいて再度お試しください。</p>
        <button className="button" type="button" onClick={() => reset()}>再読み込み</button>
      </section>
    </main>
  );
}
