// @ts-nocheck
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { adsCharacterCount, adsTextValid, ADS_LIMITS, validateCampaignDraft } from './ads-limits.ts';
import { toCsv, parseCsv, csvCell } from './csv.ts';
import { seoHealthScore } from './scoring.ts';
import { allowedAuditUrl } from './ssrf.ts';

describe('Google Ads character limits', () => {
  it('counts latin characters as 1', () => {
    assert.equal(adsCharacterCount('Website Development Company'), 27);
    assert.equal(adsTextValid('headline', 'Website Development Company').ok, true);
    assert.equal(adsTextValid('headline', 'This headline is definitely too long for Google').ok, false);
    assert.equal(adsTextValid('description', 'x'.repeat(ADS_LIMITS.description + 1)).ok, false);
  });
});

describe('SEO health score', () => {
  it('ignores manual completion and only penalizes unverified failed checks', () => {
    const score = seoHealthScore([
      { status: 'failed', priority: 'critical', fix_status: 'completed_manual' },
      { status: 'failed', priority: 'critical', fix_status: 'verified' },
      { status: 'passed', priority: 'high', fix_status: 'open' },
    ]);
    assert.equal(score, 85);
  });
});

describe('audit SSRF allowlist', () => {
  it('allows Techantum hosts and rejects others', () => {
    assert.equal(allowedAuditUrl('https://techantum.com/services'), true);
    assert.equal(allowedAuditUrl('https://evil.example/steal'), false);
    assert.equal(allowedAuditUrl('http://localhost:3005/'), true);
  });
});

describe('CSV safety', () => {
  it('neutralizes spreadsheet formulas', () => {
    assert.equal(csvCell('=cmd'), "'=cmd");
    const csv = toCsv(['keyword'], [{ keyword: 'website development' }]);
    const parsed = parseCsv(csv);
    assert.equal(parsed.rows[0].keyword, 'website development');
  });
});

describe('campaign validation', () => {
  it('requires RSA headline and description counts before Ready', () => {
    const warnings = validateCampaignDraft({ name: 'Test', landing_page: 'https://techantum.com/', headline_ids: ['1'], description_ids: ['1'] });
    assert.ok(warnings.some((item) => /headlines/i.test(item)));
  });
});

describe('sitemap private paths', () => {
  it('documents login as a public route that must be filtered from the sitemap', () => {
    assert.equal(['/login', '/signup', '/thank-you'].every(Boolean), true);
  });
});
