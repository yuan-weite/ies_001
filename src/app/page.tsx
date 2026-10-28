import { redirect } from 'next/navigation';
import { getCurrentEmployee } from '@/lib/session';

export default async function IndexPage() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');
  redirect('/session/continue');
}
