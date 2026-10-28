import { Header } from '@/components/header';
import { requireUser } from '@/lib/guards';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireUser();
  return (
    <>
      <Header employee={employee} />
      {children}
    </>
  );
}
