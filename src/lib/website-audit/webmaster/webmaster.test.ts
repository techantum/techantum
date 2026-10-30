import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cacheKey, DEFAULT_AGENT_SETTINGS, runWebMaster, reviewPageWithWebMaster } from './agent';
import { classifyDeterministic, validateAgentFindings, boundReference } from './validator';
import { categoriesForIssue, retrieveForSkills, retrieveChunks } from './retrieval';
import { routeSkills, selectRepresentativePages } from './routing';
import { consolidateFindings, preferDeterministic } from './consolidate';
import { sanitizeText, sanitizeEvidence } from './sanitize';
import { SEED_CHUNKS } from './knowledge-seed';
import { GOLDEN_CASES } from './golden';
import { runGoldenSuite, scoreCase } from './evaluation';
import { securityHygieneFindings } from './hygiene';
import { extractPage } from '../html';
import { buildPageEvidence } from './evidence';
import type { FindingDraft } from '../types';

const det = (partial: Partial<FindingDraft> & Pick<FindingDraft, 'rule_code' | 'title'>): FindingDraft => ({
  category: 'seo',
  severity: 'medium',
  description: 'd',
  recommendation: 'r',
  source: 'SYSTEM',
  ...partial,
});

describe('webmaster routing', () => {
  it('runs technical only when scanner found technical issues', () => {
    const skills = routeSkills({ pageType: 'other', technicalCount: 4, layoutAnomaly: false, hasScreenshot: false, contentChars: 20, formCount: 0 }, { uiux: true, content: true, seo: false });
    assert.deepEqual(skills, ['technical']);
  });
  it('homepage gets uiux content and technical', () => {
    const skills = routeSkills({ pageType: 'home', technicalCount: 0, layoutAnomaly: false, hasScreenshot: true, contentChars: 400, formCount: 0 }, { uiux: true, content: true, seo: true });
    assert.ok(skills.includes('uiux'));
    assert.ok(skills.includes('content'));
  });
  it('selects representative pages and skips duplicate templates', () => {
    const picked = selectRepresentativePages([
      { url: '/a', pageType: 'other', layoutAnomaly: false, technicalCount: 0, templateHash: 't1' },
      { url: '/b', pageType: 'other', layoutAnomaly: false, technicalCount: 0, templateHash: 't1' },
      { url: '/', pageType: 'home', layoutAnomaly: false, technicalCount: 1, templateHash: 'home' },
      { url: '/contact', pageType: 'contact', layoutAnomaly: false, technicalCount: 0, templateHash: 'c' },
    ], 5);
    assert.ok(picked.some((item) => item.pageType === 'home'));
    assert.ok(picked.some((item) => item.pageType === 'contact'));
    assert.equal(picked.filter((item) => item.templateHash === 't1').length, 1);
  });
});

describe('knowledge retrieval', () => {
  it('maps SEO issues to SEO chunks only', () => {
    assert.deepEqual(categoriesForIssue('seo'), ['seo']);
    const chunks = retrieveChunks(SEED_CHUNKS, categoriesForIssue('seo'), 10);
    assert.ok(chunks.length);
    assert.ok(chunks.every((item) => item.category === 'seo'));
  });
  it('maps accessibility to a11y/forms', () => {
    const cats = categoriesForIssue('accessibility');
    assert.ok(cats.includes('accessibility'));
    const chunks = retrieveChunks(SEED_CHUNKS, cats, 20);
    assert.ok(chunks.some((item) => item.category === 'accessibility'));
    assert.ok(!chunks.some((item) => item.category === 'performance'));
  });
  it('maps UI to Techantum UI standards', () => {
    const chunks = retrieveForSkills(['uiux'], SEED_CHUNKS, 20);
    assert.ok(chunks.some((item) => item.source_name.includes('Techantum')));
  });
});

describe('json validation', () => {
  it('accepts valid findings and rejects invalid json', () => {
    const ok = validateAgentFindings(JSON.stringify({
      findings: [{ category: 'ui', finding_type: 'best_practice', severity: 'low', title: 'H2 outlier', description: 'Most H2s 32px one 26px', recommendation: 'Align H2 scale', confidence: 0.84, standard_reference: { name: 'Techantum Web Quality Standard', rule: 'UI-TYPO-001' } }],
    }), 'https://x.com', 0.6);
    assert.equal(ok.length, 1);
    assert.equal(ok[0].finding_type, 'best_practice');
    assert.equal(validateAgentFindings('not-json', 'https://x.com', 0.6).length, 0);
    assert.equal(validateAgentFindings('{}', 'https://x.com', 0.6).length, 0);
  });
  it('marks low confidence as manual review', () => {
    const rows = validateAgentFindings({
      findings: [{ category: 'ux', finding_type: 'ai_recommendation', severity: 'medium', title: 'Maybe', description: 'unclear', recommendation: 'check', confidence: 0.2 }],
    }, 'https://x.com', 0.6);
    assert.equal(rows[0].finding_type, 'manual_review');
  });
  it('does not allow AI to assign critical without verified type', () => {
    const rows = validateAgentFindings({
      findings: [{ category: 'ui', finding_type: 'ai_recommendation', severity: 'critical', title: 'Ugly', description: 'The UI needs improvement', recommendation: 'fix', confidence: 0.99 }],
    }, 'https://x.com', 0.6);
    assert.equal(rows.length, 0);
  });
  it('clamps critical AI opinion to high when type is recommendation', () => {
    const rows = validateAgentFindings({
      findings: [{ category: 'responsive', finding_type: 'ai_recommendation', severity: 'critical', title: 'Mobile nav overflow likely', description: 'Hero CTA may be clipped on 390px based on screenshot note.', recommendation: 'Check nav wrapping.', confidence: 0.9, standard_reference: { name: 'Techantum Best Practice' } }],
    }, 'https://x.com', 0.6);
    assert.equal(rows[0].severity, 'high');
  });
  it('rejects fabricated WCAG citations without a rule', () => {
    const ref = boundReference({ name: 'WCAG 9.9.9 Completely Made Up' });
    assert.equal(ref?.name, 'Techantum Best Practice');
  });
});

describe('classification and consolidation', () => {
  it('marks deterministic as verified issue', () => {
    const row = classifyDeterministic(det({ rule_code: 'seo.missing_h1', title: 'Missing H1' }));
    assert.equal(row.finding_type, 'verified_issue');
  });
  it('deduplicates site-wide AI findings', () => {
    const a = validateAgentFindings({
      findings: [
        { category: 'ui', finding_type: 'best_practice', severity: 'low', title: 'Button height', description: 'x', recommendation: 'y', confidence: 0.8, page_url: '/a', standard_reference: { name: 'Techantum Best Practice' } },
        { category: 'ui', finding_type: 'best_practice', severity: 'low', title: 'Button height', description: 'x', recommendation: 'y', confidence: 0.8, page_url: '/b', standard_reference: { name: 'Techantum Best Practice' } },
      ],
    }, '/a', 0.6);
    a[0].page_url = '/a';
    a[1].page_url = '/b';
    const merged = consolidateFindings(a);
    assert.equal(merged.length, 1);
  });
  it('prefers deterministic evidence over overlapping AI', () => {
    const d = [classifyDeterministic(det({ rule_code: 'seo.missing_h1', title: 'Missing H1', page_url: '/a' }))];
    const ai = validateAgentFindings({
      findings: [{ category: 'seo', finding_type: 'ai_recommendation', severity: 'medium', title: 'Missing H1 maybe', description: 'no h1', recommendation: 'add', confidence: 0.9, page_url: '/a' }],
    }, '/a', 0.6);
    const mixed = preferDeterministic(ai, d);
    assert.ok(mixed.some((item) => item.source === 'SYSTEM'));
  });
});

describe('sanitize and hygiene', () => {
  it('redacts secrets', () => {
    assert.ok(!sanitizeText('password=secret123 and hello', 500).includes('secret123'));
    const clean = sanitizeEvidence({ authorization: 'Bearer abc', note: 'ok' });
    assert.equal(clean.authorization, '[redacted]');
  });
  it('flags insecure form action', () => {
    const page = extractPage('<html><body><form action="http://evil.test/post"><input name="a"></form></body></html>', 'https://site.test/', 200);
    assert.ok(securityHygieneFindings(page).some((item) => item.rule_code === 'sec.insecure_form_action'));
  });
});

describe('cache and agent mocks', () => {
  it('reuses cached JSON without calling generate', async () => {
    let calls = 0;
    const evidence = buildPageEvidence({
      page: extractPage('<html lang="en"><head><title>Hello world page</title></head><body><h1>Hi</h1><p>Content here.</p></body></html>', 'https://site.test/', 200),
      viewport: 'desktop',
      findings: [],
      hasScreenshot: false,
      maxChars: 500,
    });
    const payload = { findings: [{ category: 'content', finding_type: 'ai_recommendation', severity: 'suggestion', title: 'CTA could be clearer', description: 'Hero CTA says Submit', recommendation: 'Use Start project', confidence: 0.8, standard_reference: { name: 'Techantum Best Practice' } }] };
    const store = new Map<string, unknown>([[cacheKey({ url: evidence.page.url, contentHash: 'h', skills: ['content'] }), payload]]);
    const result = await reviewPageWithWebMaster({
      evidence,
      skills: ['content'],
      threshold: 0.6,
      contentHash: 'h',
      cacheGet: async (key) => store.get(key) || null,
      generate: async () => {
        calls += 1;
        return { text: '{}', provider: 'openai', model: 'x', id: null, usedFallback: false, attempts: [] };
      },
    });
    assert.equal(calls, 0);
    assert.equal(result.cached, true);
    assert.equal(result.findings.length, 1);
  });
  it('survives AI failure and keeps deterministic findings', async () => {
    const page = extractPage('<html><body><p>x</p></body></html>', 'https://site.test/x', 200);
    const ran = await runWebMaster({
      pages: [page],
      findings: [det({ rule_code: 'seo.missing_h1', title: 'Missing H1', page_url: page.normalizedUrl })],
      settings: DEFAULT_AGENT_SETTINGS,
      hashes: { [page.normalizedUrl]: 'h' },
      screenshots: {},
      layoutFlags: {},
      generate: async () => { throw new Error('provider down'); },
    });
    assert.equal(ran.ai_review_status, 'failed');
    assert.ok(ran.findings.some((item) => item.rule_code === 'seo.missing_h1'));
  });
});

describe('false positive guards', () => {
  it('does not invent issues when mock returns none for intentional variants', async () => {
    const page = extractPage('<html lang="en"><head><title>Buttons</title></head><body><h1>Buttons</h1><button class="primary">Go</button><button class="ghost">Learn</button></body></html>', 'https://site.test/buttons', 200);
    const ran = await runWebMaster({
      pages: [page],
      findings: [],
      settings: DEFAULT_AGENT_SETTINGS,
      hashes: { [page.normalizedUrl]: 'h' },
      screenshots: {},
      layoutFlags: {},
      generate: async () => ({ text: '{"findings":[]}', provider: 'openai', model: 'mock', id: '1', usedFallback: false, attempts: [] }),
    });
    assert.equal(ran.findings.filter((item) => item.source === 'AI').length, 0);
  });
});

describe('golden suite mocked', () => {
  it('runs stored cases without paid AI', async () => {
    assert.ok(GOLDEN_CASES.length >= 10);
    const result = await runGoldenSuite();
    assert.equal(result.used_live_ai, false);
    assert.ok(result.precision >= 0);
    const missing = scoreCase(['seo.missing_h1'], ['seo.missing_h1', 'seo.missing_title']);
    assert.equal(missing.fp, 1);
  });
});
