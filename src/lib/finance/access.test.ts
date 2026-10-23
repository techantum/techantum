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

  it('keeps finance, recruitment, lead discovery, and HR with the super admin', () => {
    assert.equal(canAccessAdminPath('ADMIN', '/admin/lead-discovery'), false);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/recruitment'), false);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/hr/payslips'), false);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/whatsapp/inbox'), true);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/partners'), true);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/youtube-research/settings'), false);
    assert.equal(canAccessAdminPath('SUPER_ADMIN', '/admin/youtube-research/settings'), true);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/meta-ads'), true);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/master-data'), true);
    assert.equal(canAccessAdminPath('SUPER_ADMIN', '/admin/lead-discovery'), true);
    assert.equal(canAccessAdminPath('SUPER_ADMIN', '/admin/hr/employees'), true);
    const groups = filterNavGroups(
      [
        { id: 'finance' },
        { id: 'hr' },
        { id: 'recruitment' },
        { id: 'sales' },
        { id: 'whatsapp-provider' },
        { id: 'partners' },
        { id: 'ops' },
      ],
      'ADMIN'
    );
    assert.deepEqual(groups.map((g) => g.id), ['whatsapp-provider', 'partners', 'ops']);
  });
});
