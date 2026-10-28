import { Header } from '@/components/header';
import { requirePasswordChangeUser } from '@/lib/guards';

export default async function LockedLayout({ children }: { children: React.ReactNode }) {
  const employee = await requirePasswordChangeUser();
  return (
    <>
      <Header employee={employee} locked />
      {children}
    </>
  );
}
