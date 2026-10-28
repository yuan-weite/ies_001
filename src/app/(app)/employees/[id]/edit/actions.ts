'use server';

import { redirect } from 'next/navigation';
import { updateEmployee } from '@/lib/employees';
import { requireAdmin } from '@/lib/guards';
import type { ActionState } from '@/lib/types';

export async function updateEmployeeAction(
  id: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = await updateEmployee(id, {
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    department: String(formData.get('department') ?? ''),
    companyType: String(formData.get('companyType') ?? ''),
  });
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  redirect('/employees?updated=1');
}
