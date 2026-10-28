'use server';

import { redirect } from 'next/navigation';
import { registerEmployee } from '@/lib/employees';
import { requireAdmin } from '@/lib/guards';
import type { ActionState } from '@/lib/types';

export async function createEmployeeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await registerEmployee({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    department: String(formData.get('department') ?? ''),
    companyType: String(formData.get('companyType') ?? ''),
  });
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  redirect('/employees?registered=1');
}
