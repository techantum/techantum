import { canAccessFinance } from '../admin/roles.ts';
import type { FinanceAction, FinanceCapability } from './access-types.ts';

export type { FinanceAction, FinanceCapability };

const ROLE_CAPABILITY: Record<string, FinanceCapability> = {
  SUPER_ADMIN: { read: true, write: true, export: true, settings: true, cancel: true },
  FINANCE_ADMIN: { read: true, write: true, export: true, settings: true, cancel: true },
  ACCOUNTANT: { read: true, write: false, export: true, settings: false, cancel: false },
};

export function financeCapability(role?: string | null): FinanceCapability | null {
  if (!role || !canAccessFinance(role)) return null;
  return ROLE_CAPABILITY[role] || null;
}
