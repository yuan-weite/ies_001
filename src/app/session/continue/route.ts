import { redirect } from 'next/navigation';
import { homePath } from '@/lib/paths';
import { getCurrentEmployee, setSessionCookie } from '@/lib/session';

export async function GET() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');
  await setSessionCookie(employee);
  if (employee.mustChangePassword) redirect('/change-password');
  redirect(homePath(employee.role));
}
