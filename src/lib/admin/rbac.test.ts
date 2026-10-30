import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  inheritAccess,
  maxAccess,
  mergeAccessMaps,
  canWithAccess,
  grantsAction,
  matchFeatureForPath,
  matchFeatureForApi,
  type FeatureNode,
} from './access.ts';
import { classifyAdminInvite, roleCodeFromName } from './rbac.ts';
import { validateAdminPassword } from './password-policy.ts';
import { allowAdminApi, allowAdminPath } from './path-access.ts';
import { hashInviteToken, generateInviteToken } from '../partner/invite-token.ts';
import { visibleAdminNav } from '../cms/admin-nav.ts';
import { canAccessAdminPath } from './roles.ts';

const tree: FeatureNode[] = [
  {
    key: 'finance',
    label: 'Finance',
    module: 'Finance',
    parentKey: null,
    sensitive: false,
    children: [
      { key: 'finance.invoices', label: 'Invoices', module: 'Finance', route: '/admin/finance/invoices', parentKey: 'finance', sensitive: false, children: [] },
      { key: 'finance.vendors', label: 'Vendors', module: 'Finance', route: '/admin/finance/vendors', parentKey: 'finance', sensitive: false, children: [] },
      { key: 'finance.settings', label: 'Settings', module: 'Finance', route: '/admin/finance/settings', parentKey: 'finance', sensitive: true, children: [] },
    ],
  },
];

describe('RBAC access merge', () => {
  it('uses highest access across roles', () => {
    const merged = mergeAccessMaps([{ 'finance.invoices': 'READ' }, { 'finance.invoices': 'FULL' }]);
    assert.equal(merged['finance.invoices'], 'FULL');
    assert.equal(maxAccess('READ', 'NONE'), 'READ');
  });

  it('inherits parent Full Access then honors child overrides', () => {
    const resolved = inheritAccess(tree, { finance: 'FULL', 'finance.invoices': 'READ', 'finance.settings': 'NONE' });
    assert.equal(resolved.finance, 'FULL');
    assert.equal(resolved['finance.invoices'], 'READ');
    assert.equal(resolved['finance.vendors'], 'FULL');
    assert.equal(resolved['finance.settings'], undefined);
    const withoutSettings = inheritAccess(tree, { finance: 'FULL' });
    assert.equal(withoutSettings['finance.vendors'], 'FULL');
    assert.equal(withoutSettings['finance.settings'], undefined);
  });

  it('maps READ and FULL to granular actions', () => {
    assert.equal(grantsAction('READ', 'view'), true);
    assert.equal(grantsAction('READ', 'create'), false);
    assert.equal(grantsAction('FULL', 'create'), true);
    assert.equal(grantsAction('NONE', 'view'), false);
  });
});

describe('invitation tokens', () => {
  it('hashes tokens and classifies expiry/reuse/revoke', () => {
    const token = generateInviteToken();
    assert.equal(hashInviteToken(token).length, 64);
    assert.notEqual(token, hashInviteToken(token));
    const pending = { status: 'pending', expires_at: new Date(Date.now() + 60_000).toISOString() };
    assert.equal(classifyAdminInvite(pending), 'valid');
    assert.equal(classifyAdminInvite({ ...pending, status: 'accepted', accepted_at: new Date().toISOString() }), 'used');
    assert.equal(classifyAdminInvite({ status: 'pending', expires_at: new Date(Date.now() - 1000).toISOString() }), 'expired');
    assert.equal(classifyAdminInvite({ status: 'revoked', expires_at: pending.expires_at }), 'revoked');
    assert.equal(classifyAdminInvite(null), 'invalid');
  });

  it('validates password policy', () => {
    assert.ok(validateAdminPassword('short'));
    assert.ok(validateAdminPassword('passwordonly'));
    assert.equal(validateAdminPassword('Passw0rd', 'other'), 'Passwords do not match.');
    assert.equal(validateAdminPassword('Passw0rd', 'Passw0rd'), null);
  });
});

describe('path and API gates', () => {
  it('blocks unauthorized routes and APIs for RBAC users', () => {
    const auth = { role: 'ADMIN', rbacManaged: true, isSuperAdmin: false, access: { 'finance.invoices': 'READ' as const } };
    assert.equal(allowAdminPath(auth, '/admin/finance/invoices'), true);
    assert.equal(allowAdminPath(auth, '/admin/hr/employees'), false);
    assert.equal(allowAdminApi(auth, '/api/admin/finance/invoices', 'GET'), true);
    assert.equal(allowAdminApi(auth, '/api/admin/finance/invoices', 'POST'), false);
    assert.equal(allowAdminApi(auth, '/api/admin/hr/employees', 'GET'), false);
  });

  it('keeps Super Admin unrestricted', () => {
    const auth = { role: 'SUPER_ADMIN', rbacManaged: true, isSuperAdmin: true, access: {} };
    assert.equal(allowAdminPath(auth, '/admin/roles'), true);
    assert.equal(allowAdminApi(auth, '/api/admin/rbac/roles', 'POST'), true);
  });

  it('does not change legacy ADMIN path rules', () => {
    assert.equal(canAccessAdminPath('ADMIN', '/admin/hr/employees'), false);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/whatsapp/inbox'), true);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/users'), false);
    assert.equal(canAccessAdminPath('SUPER_ADMIN', '/admin/users'), true);
  });
});

describe('sidebar filtering', () => {
  it('hides modules without access and keeps empty parents out', () => {
    const nav = visibleAdminNav('ADMIN', { finance: 'FULL', 'finance.invoices': 'FULL' }, true);
    const labels: string[] = [];
    const walk = (items: ReturnType<typeof visibleAdminNav>) => {
      for (const item of items) {
        labels.push(item.label);
        if (item.children) walk(item.children);
      }
    };
    walk(nav);
    assert.equal(labels.includes('Finance') || labels.includes('Invoices'), true);
    assert.equal(labels.includes('HR'), false);
    assert.equal(canWithAccess({ 'finance.invoices': 'READ' }, 'finance.invoices', 'READ'), true);
    assert.equal(matchFeatureForPath(tree, '/admin/finance/invoices/new')?.key, 'finance.invoices');
    assert.equal(matchFeatureForApi(tree, '/api/admin/finance/invoices')?.key, 'finance.invoices');
  });
});

describe('permission catalog', () => {
  it('does not emit duplicate permission keys', async () => {
    const { permissionCatalog } = await import('./permission-registry.ts');
    const keys = permissionCatalog().map((row) => row.permission_key);
    assert.equal(keys.length, new Set(keys).size);
  });
});

describe('role codes', () => {
  it('builds unique-style codes from names', () => {
    assert.equal(roleCodeFromName('Finance Admin'), 'FINANCE_ADMIN');
    assert.equal(roleCodeFromName('Project Manager'), 'PROJECT_MANAGER');
  });
});
