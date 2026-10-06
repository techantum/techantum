import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canManagePartnerTeam,
  defaultPartnerNavAccess,
  firstAllowedPartnerHref,
  isPartnerPathAlwaysAllowed,
  partnerHasNavAccess,
  partnerNavKeyForPath,
  sanitizePartnerNavAccess,
} from './nav.ts';

describe('partner nav access', () => {
  it('gives partner admins every menu, including Team', () => {
    const access = defaultPartnerNavAccess('partner_admin');
    assert.equal(access.team, true);
    assert.equal(access.dashboard, true);
    assert.equal(access['lead-discovery'], true);
  });

  it('defaults partner users to all menus except Team', () => {
    const access = defaultPartnerNavAccess('partner_user');
    assert.equal(access.team, false);
    assert.equal(access.dashboard, true);
    assert.equal(access.requirements, true);
  });

  it('keeps partner admin access even if stored nav_access tries to disable menus', () => {
    const access = sanitizePartnerNavAccess({ dashboard: false, team: false }, 'partner_admin');
    assert.equal(access.dashboard, true);
    assert.equal(access.team, true);
  });

  it('applies stored toggles for partner users', () => {
    const user = {
      role: 'partner_user' as const,
      nav_access: { dashboard: true, packages: false, team: true, 'lead-discovery': true },
    };
    assert.equal(partnerHasNavAccess(user, 'packages', { lead_discovery_enabled: true }), false);
    assert.equal(partnerHasNavAccess(user, 'team', { lead_discovery_enabled: true }), true);
    assert.equal(partnerHasNavAccess(user, 'lead-discovery', { lead_discovery_enabled: false }), false);
    assert.equal(partnerHasNavAccess(user, 'lead-discovery', { lead_discovery_enabled: true }), true);
    assert.equal(canManagePartnerTeam(user), true);
  });

  it('matches the most specific nav key for a path', () => {
    assert.equal(partnerNavKeyForPath('/partner/requirements/new'), 'new-requirement');
    assert.equal(partnerNavKeyForPath('/partner/requirements/abc'), 'requirements');
    assert.equal(partnerNavKeyForPath('/partner/lead-discovery/run-1'), 'lead-discovery');
    assert.equal(partnerNavKeyForPath('/partner/dashboard'), 'dashboard');
    assert.equal(partnerNavKeyForPath('/partner/profile'), null);
  });

  it('allows profile and notifications without a nav grant', () => {
    assert.equal(isPartnerPathAlwaysAllowed('/partner/profile'), true);
    assert.equal(isPartnerPathAlwaysAllowed('/partner/notifications'), true);
    assert.equal(isPartnerPathAlwaysAllowed('/partner/team'), false);
  });

  it('falls back to the first granted menu', () => {
    const href = firstAllowedPartnerHref(
      { role: 'partner_user', nav_access: { dashboard: false, support: true } },
      { lead_discovery_enabled: false }
    );
    assert.equal(href, '/partner/packages');
  });
});
