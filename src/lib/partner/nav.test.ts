import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canManagePartnerTeam,
  defaultPartnerNavAccess,
  firstAllowedPartnerHref,
  isPartnerPathAlwaysAllowed,
  partnerHasNavAccess,
  partnerNavKeyForPath,
  PARTNER_YOUTUBE_NAV,
  sanitizePartnerNavAccess,
} from './nav.ts';

describe('partner nav access', () => {
  it('gives partner admins the full left menu plus profile and support', () => {
    const access = defaultPartnerNavAccess('partner_admin');
    assert.equal(access.dashboard, true);
    assert.equal(access['lead-discovery'], true);
    assert.equal(access['youtube-research'], true);
    assert.equal(access.packages, true);
    assert.equal(access.requirements, true);
    assert.equal(access.documents, true);
    assert.equal(access.team, true);
    assert.equal(access.profile, true);
    assert.equal(access.support, true);
  });

  it('defaults partner users to all menus except Team and YouTube Research', () => {
    const access = defaultPartnerNavAccess('partner_user');
    assert.equal(access.team, false);
    assert.equal(access['youtube-research'], false);
    assert.equal(access.dashboard, true);
    assert.equal(access.requirements, true);
  });

  it('keeps the full partner admin menu even if stored nav_access tries to hide it', () => {
    const access = sanitizePartnerNavAccess({ dashboard: false, team: false, support: false }, 'partner_admin');
    assert.equal(access.dashboard, true);
    assert.equal(access.support, true);
    assert.equal(access.team, true);
    assert.equal(access.profile, true);
    assert.equal(access.packages, true);
    assert.equal(access['lead-discovery'], true);
    assert.equal(access['youtube-research'], true);
  });

  it('applies stored toggles for partner users', () => {
    const user = {
      role: 'partner_user' as const,
      nav_access: { dashboard: true, packages: false, team: true, 'lead-discovery': true },
    };
    assert.equal(sanitizePartnerNavAccess({ 'new-requirement': true, requirements: false }, 'partner_user').requirements, true);
    assert.equal(partnerHasNavAccess(user, 'packages', { lead_discovery_enabled: true }), false);
    assert.equal(partnerHasNavAccess(user, 'team', { lead_discovery_enabled: true }), true);
    assert.equal(partnerHasNavAccess(user, 'lead-discovery', { lead_discovery_enabled: false }), false);
    assert.equal(partnerHasNavAccess(user, 'lead-discovery', { lead_discovery_enabled: true }), true);
    assert.equal(partnerHasNavAccess({ role: 'partner_user', nav_access: {} }, 'youtube-research'), false);
    assert.equal(partnerHasNavAccess({ role: 'partner_user', nav_access: { 'youtube-research': true } }, 'youtube-research'), true);
    assert.equal(canManagePartnerTeam(user), true);
    assert.equal(canManagePartnerTeam({ role: 'partner_admin', nav_access: { team: false } }), true);
  });

  it('matches the most specific nav key for a path', () => {
    assert.equal(partnerNavKeyForPath('/partner/requirements/new'), 'requirements');
    assert.equal(partnerNavKeyForPath('/partner/requirements/abc'), 'requirements');
    assert.equal(partnerNavKeyForPath('/partner/lead-discovery/run-1'), 'lead-discovery');
    assert.equal(partnerNavKeyForPath('/partner/youtube-research/overview'), 'youtube-research');
    assert.deepEqual(PARTNER_YOUTUBE_NAV.map((item) => item.label), ['Dashboard']);
    assert.equal(partnerNavKeyForPath('/partner/dashboard'), 'dashboard');
    assert.equal(partnerNavKeyForPath('/partner/profile'), 'profile');
  });

  it('allows profile, support, and notifications without a nav grant', () => {
    assert.equal(isPartnerPathAlwaysAllowed('/partner/profile'), true);
    assert.equal(isPartnerPathAlwaysAllowed('/partner/notifications'), true);
    assert.equal(isPartnerPathAlwaysAllowed('/partner/support'), true);
    assert.equal(isPartnerPathAlwaysAllowed('/partner/team'), false);
  });

  it('falls back to the first granted menu', () => {
    const href = firstAllowedPartnerHref(
      { role: 'partner_user', nav_access: { dashboard: false, support: true } },
      { lead_discovery_enabled: false }
    );
    assert.equal(href, '/partner/requirements');
  });
});
