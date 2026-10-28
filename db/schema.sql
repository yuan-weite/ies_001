CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  department text NOT NULL,
  company_type text NOT NULL CHECK (company_type IN ('own', 'other')),
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_employee_id_idx
  ON password_reset_tokens (employee_id);

CREATE TABLE IF NOT EXISTS dev_mailbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dev_mailbox_recipient_idx
  ON dev_mailbox (recipient, created_at DESC);
