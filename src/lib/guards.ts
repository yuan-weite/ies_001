import { redirect } from 'next/navigation';
import { getCurrentEmployee } from '@/lib/session';
import type { Employee } from '@/lib/types';

export async function requireUser(): Promise<Employee> {
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');
  if (employee.mustChangePassword) redirect('/change-password');
  return employee;
}

export async function requireAdmin(): Promise<Employee> {
  const employee = await requireUser();
  if (employee.role !== 'admin') redirect('/home');
  return employee;
}

export async function requirePasswordChangeUser(): Promise<Employee> {
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');
  if (!employee.mustChangePassword) redirect('/session/continue');
  return employee;
}
