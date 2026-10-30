import { canAccessFinance } from '../admin/roles.ts';
import type { AccessLevel } from '../admin/access.ts';
import type { FinanceAction, FinanceCapability } from './access-types.ts';

export type { FinanceAction, FinanceCapability };

const ROLE_CAPABILITY: Record<string, FinanceCapability> = {
  SUPER_ADMIN: { read: true, write: true, export: true, settings: true, cancel: true },
  FINANCE_ADMIN: { read: true, write: true, export: true, settings: true, cancel: true },
  ACCOUNTANT: { read: true, write: false, export: true, settings: false, cancel: false },
};

function fromAccess(access: Record<string, AccessLevel>): FinanceCapability | null {
  const moduleLevel = access.finance || 'NONE';
  const invoices = access['finance.invoices'] || moduleLevel;
  const settings = access['finance.settings'] || 'NONE';
  const readable = [moduleLevel, invoices, access['finance.clients'], access['finance.reports']].some(
    (level) => level === 'READ' || level === 'FULL'
  );
  if (!readable) return null;
  const writable = [moduleLevel, invoices].some((level) => level === 'FULL');
  return {
    read: true,
    write: writable,
    export: readable,
    settings: settings === 'FULL' || moduleLevel === 'FULL',
    cancel: writable,
  };
}

export function financeCapability(role?: string | null, access?: Record<string, AccessLevel> | null): FinanceCapability | null {
  if (access && Object.keys(access).some((key) => key === 'finance' || key.startsWith('finance.'))) {
    return fromAccess(access);
  }
  if (!role || !canAccessFinance(role)) return null;
  return ROLE_CAPABILITY[role] || null;
}
