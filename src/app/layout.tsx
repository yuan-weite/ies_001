import type { Metadata } from 'next';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: '社内管理',
    template: '%s | 社内管理',
  },
  description: '従業員の登録とログインを扱う社内管理システムです。',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
