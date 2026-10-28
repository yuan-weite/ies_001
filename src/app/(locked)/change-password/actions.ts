'use server';

import { redirect } from 'next/navigation';
import { changeOwnPassword, findEmployeeById } from '@/lib/employees';
import { homePath } from '@/lib/paths';
import { getCurrentEmployee, setSessionCookie } from '@/lib/session';
import type { ActionState } from '@/lib/types';

export async function changePasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');
  if (!employee.mustChangePassword) redirect('/session/continue');

  const result = await changeOwnPassword(
    employee.id,
    String(formData.get('currentPassword') ?? ''),
    String(formData.get('newPassword') ?? ''),
    String(formData.get('confirmPassword') ?? ''),
  );
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };

  const updated = await findEmployeeById(employee.id);
  if (!updated) redirect('/login');
  await setSessionCookie(updated);
  redirect(homePath(updated.role));
}
