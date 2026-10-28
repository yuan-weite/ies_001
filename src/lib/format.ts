import type { CompanyType } from '@/lib/types';

export function companyLabel(companyType: CompanyType): '自社' | '他社' {
  return companyType === 'own' ? '自社' : '他社';
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(date);
}

export function appBaseUrl(): string {
  const configured = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  return configured.replace(/\/$/, '');
}
