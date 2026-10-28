export type CompanyType = 'own' | 'other';

export type Role = 'admin' | 'employee';

export type Employee = {
  id: string;
  email: string;
  fullName: string;
  department: string;
  companyType: CompanyType;
  role: Role;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ActionState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  doneMessage?: string;
};

export type MailboxMessage = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  createdAt: Date;
};
