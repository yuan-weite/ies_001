import { pool, isUniqueViolation } from '@/lib/db';
import {
  deliverEmail,
  initialPasswordEmail,
  isSmtpConfigured,
} from '@/lib/email';
import { appBaseUrl } from '@/lib/format';
import {
  dummyPasswordCheck,
  generateInitialPassword,
  hashPassword,
  validatePassword,
  verifyPassword,
} from '@/lib/passwords';
import type { ActionState, CompanyType, Employee, Role } from '@/lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmployeeRow = {
  id: string;
  email: string;
  full_name: string;
  department: string;
  company_type: CompanyType;
  role: Role;
  must_change_password: boolean;
  created_at: Date;
  updated_at: Date;
};

const EMPLOYEE_COLUMNS = `id, email, full_name, department, company_type, role, must_change_password, created_at, updated_at`;

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    department: row.department,
    companyType: row.company_type,
    role: row.role,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseEmployeeInput(input: {
  fullName: string;
  email: string;
  department: string;
  companyType: string;
}):
  | { ok: true; fullName: string; email: string; department: string; companyType: CompanyType }
  | { ok: false; error: string; fieldErrors: NonNullable<ActionState['fieldErrors']> } {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const department = input.department.trim();
  const companyType: CompanyType | null =
    input.companyType === 'own' || input.companyType === 'other' ? input.companyType : null;
  const fieldErrors: NonNullable<ActionState['fieldErrors']> = {};

  if (!fullName || fullName.length > 80) {
    fieldErrors.fullName = '氏名は1文字以上80文字以内で入力してください。';
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    fieldErrors.email = 'メールアドレスの形式が正しくありません。';
  }
  if (!department || department.length > 80) {
    fieldErrors.department = '所属は1文字以上80文字以内で入力してください。';
  }
  if (!companyType) {
    fieldErrors.companyType = '会社は自社または他社を選択してください。';
  }

  if (!companyType || Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: '入力内容を確認してください。', fieldErrors };
  }

  return {
    ok: true,
    fullName,
    email,
    department,
    companyType,
  };
}

export async function listEmployees(): Promise<Employee[]> {
  const result = await pool.query<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees ORDER BY created_at DESC, email ASC`,
  );
  return result.rows.map(toEmployee);
}

export async function findEmployeeById(id: string): Promise<Employee | null> {
  if (!isUuid(id)) return null;
  const result = await pool.query<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = $1`,
    [id],
  );
  return result.rowCount === 1 ? toEmployee(result.rows[0]) : null;
}

export async function findEmployeeByEmail(email: string): Promise<Employee | null> {
  const result = await pool.query<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  return result.rowCount === 1 ? toEmployee(result.rows[0]) : null;
}

export async function authenticate(emailRaw: string, password: string): Promise<Employee | null> {
  const email = emailRaw.trim().toLowerCase();
  const result = await pool.query<EmployeeRow & { password_hash: string }>(
    `SELECT ${EMPLOYEE_COLUMNS}, password_hash FROM employees WHERE email = $1`,
    [email],
  );
  if (result.rowCount !== 1) {
    await dummyPasswordCheck(password);
    return null;
  }
  const matches = await verifyPassword(password, result.rows[0].password_hash);
  if (!matches) return null;
  return toEmployee(result.rows[0]);
}

export async function registerEmployee(input: {
  fullName: string;
  email: string;
  department: string;
  companyType: string;
}): Promise<ActionState & { ok: boolean }> {
  const parsed = parseEmployeeInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };

  if (process.env.NODE_ENV === 'production' && !isSmtpConfigured()) {
    return { ok: false, error: 'メール送信が設定されていないため、登録できません。' };
  }

  const password = generateInitialPassword();
  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO employees
          (email, full_name, department, company_type, password_hash, must_change_password, role)
         VALUES ($1, $2, $3, $4, $5, true, 'employee')`,
        [parsed.email, parsed.fullName, parsed.department, parsed.companyType, passwordHash],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        await client.query('ROLLBACK');
        return {
          ok: false,
          error: 'このメールアドレスはすでに登録されています。',
          fieldErrors: { email: 'このメールアドレスはすでに登録されています。' },
        };
      }
      throw error;
    }

    const message = initialPasswordEmail({
      fullName: parsed.fullName,
      email: parsed.email,
      password,
      loginUrl: `${appBaseUrl()}/login`,
    });

    if (!isSmtpConfigured()) {
      await deliverEmail(message, client);
      await client.query('COMMIT');
      committed = true;
      return { ok: true };
    }

    await client.query('COMMIT');
    committed = true;
    try {
      await deliverEmail(message);
    } catch {
      await pool.query('DELETE FROM employees WHERE email = $1', [parsed.email]);
      return { ok: false, error: 'メールを送信できなかったため、登録を取り消しました。' };
    }
    return { ok: true };
  } catch {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The transaction is already closed.
      }
    }
    console.error(JSON.stringify({ event: 'employee_registration_failed' }));
    return { ok: false, error: '登録に失敗しました。時間をおいて再度お試しください。' };
  } finally {
    client.release();
  }
}

export async function updateEmployee(
  id: string,
  input: {
    fullName: string;
    email: string;
    department: string;
    companyType: string;
  },
): Promise<ActionState & { ok: boolean }> {
  if (!isUuid(id)) return { ok: false, error: '従業員が見つかりません。' };
  const parsed = parseEmployeeInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };

  try {
    const result = await pool.query(
      `UPDATE employees
       SET email = $2, full_name = $3, department = $4, company_type = $5, updated_at = now()
       WHERE id = $1`,
      [id, parsed.email, parsed.fullName, parsed.department, parsed.companyType],
    );
    if (result.rowCount !== 1) return { ok: false, error: '従業員が見つかりません。' };
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: 'このメールアドレスはすでに登録されています。',
        fieldErrors: { email: 'このメールアドレスはすでに登録されています。' },
      };
    }
    console.error(JSON.stringify({ event: 'employee_update_failed' }));
    return { ok: false, error: '保存に失敗しました。時間をおいて再度お試しください。' };
  }
}

export async function changeOwnPassword(
  employeeId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ActionState & { ok: boolean }> {
  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      error: '確認用のパスワードが一致しません。',
      fieldErrors: { confirmPassword: '確認用のパスワードが一致しません。' },
    };
  }
  const policyError = validatePassword(newPassword);
  if (policyError) {
    return { ok: false, error: policyError, fieldErrors: { newPassword: policyError } };
  }

  const result = await pool.query<{ password_hash: string }>(
    'SELECT password_hash FROM employees WHERE id = $1',
    [employeeId],
  );
  if (result.rowCount !== 1) return { ok: false, error: 'ログインし直してください。' };

  const currentHash = result.rows[0].password_hash;
  const matches = await verifyPassword(currentPassword, currentHash);
  if (!matches) {
    return {
      ok: false,
      error: '現在のパスワードが正しくありません。',
      fieldErrors: { currentPassword: '現在のパスワードが正しくありません。' },
    };
  }
  if (await verifyPassword(newPassword, currentHash)) {
    return {
      ok: false,
      error: '現在のパスワードとは別のパスワードにしてください。',
      fieldErrors: { newPassword: '現在のパスワードとは別のパスワードにしてください。' },
    };
  }

  const nextHash = await hashPassword(newPassword);
  await pool.query(
    `UPDATE employees
     SET password_hash = $2, must_change_password = false, updated_at = now()
     WHERE id = $1`,
    [employeeId, nextHash],
  );
  return { ok: true };
}
