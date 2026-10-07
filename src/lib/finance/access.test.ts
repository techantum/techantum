import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canAccessAdminPath, canAccessFinance, filterNavGroups } from '../admin/roles.ts';
import { financeCapability } from './capability.ts';

describe('finance access', () => {
  it('allows Super Admin now and keeps Finance Admin / Accountant slots', () => {
    assert.equal(canAccessFinance('SUPER_ADMIN'), true);
    assert.equal(canAccessFinance('FINANCE_ADMIN'), true);
    assert.equal(canAccessFinance('ACCOUNTANT'), true);
    assert.equal(canAccessFinance('ADMIN'), false);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/finance'), false);
    assert.equal(canAccessAdminPath('SUPER_ADMIN', '/admin/finance/invoices'), true);
  });

  it('gives accountants read/export only', () => {
    const cap = financeCapability('ACCOUNTANT');
    assert.equal(cap?.read, true);
    assert.equal(cap?.export, true);
    assert.equal(cap?.write, false);
    assert.equal(financeCapability('SUPER_ADMIN')?.write, true);
  });

  it('hides the Finance nav from ordinary admins', () => {
    const groups = filterNavGroups([{ id: 'finance' }, { id: 'ops' }], 'ADMIN');
    assert.deepEqual(groups.map((g) => g.id), ['ops']);
  });
});
