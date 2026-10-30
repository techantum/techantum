import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { accessibilityFindings } from './accessibility';
import { parseAiFindings, selectAiPages } from './ai';
import { compareFindings, scoreDelta } from './compare';
import { discoverPages } from './crawl';
import { dedupeFindings, fingerprintOf } from './findings';
import { formFindings, isSafeToProbe, neverSubmitReason, validateField } from './forms';
import { extractLinks, extractPage } from './html';
import { performanceFindings } from './performance';
import { categoryScores, overallScore } from './scoring';
import { seoFindingsForPage, siteSeoFindings } from './seo';
import { aggregateTypography, typographyFindings } from './typography';
import { assertHttpUrl, isPrivateIp, isUnsafeProtocol, looksLikeInfiniteList, normalizeUrl, sameDomain, shouldSkipHref } from './url';

describe('website audit urls', () => {
  it('accepts valid https urls', () => {
    assert.equal(assertHttpUrl('https://techantum.com/about').hostname, 'techantum.com');
  });
  it('rejects invalid urls', () => {
    assert.throws(() => assertHttpUrl('not a url'));
  });
  it('rejects unsafe protocols', () => {
    assert.equal(isUnsafeProtocol('file:///etc/passwd'), true);
    assert.throws(() => assertHttpUrl('file:///etc/passwd'));
    assert.throws(() => assertHttpUrl('ftp://example.com'));
  });
  it('blocks private ips and localhost', () => {
    assert.equal(isPrivateIp('127.0.0.1'), true);
    assert.equal(isPrivateIp('10.1.2.3'), true);
    assert.equal(isPrivateIp('192.168.0.8'), true);
    assert.equal(isPrivateIp('172.16.4.4'), true);
    assert.equal(isPrivateIp('169.254.169.254'), true);
    assert.throws(() => assertHttpUrl('http://localhost/admin'));
    assert.throws(() => assertHttpUrl('http://127.0.0.1/'));
    assert.throws(() => assertHttpUrl('http://10.0.0.5/'));
  });
  it('normalizes trailing slash and tracking params', () => {
    assert.equal(normalizeUrl('https://Example.com/about/?utm_source=x'), 'https://example.com/about');
  });
});

describe('crawler', () => {
  it('stays same-domain, dedupes, and respects page limit', async () => {
    const html = {
      'https://site.test/': '<a href="/a">A</a><a href="https://site.test/a?utm_source=1">dup</a><a href="https://other.test/x">ext</a><a href="mailto:a@b.c">m</a>',
      'https://site.test/a': '<a href="/b">B</a><a href="/a">self</a>',
      'https://site.test/b': '<a href="/c">C</a>',
      'https://site.test/c': 'done',
      'https://site.test/robots.txt': 'User-agent: *',
      'https://site.test/sitemap.xml': 'not xml',
    };
    const result = await discoverPages({
      startUrl: 'https://site.test/',
      maxPages: 2,
      maxDepth: 3,
      scope: 'website',
      fetchFn: async (url) => ({ url, status: 200, body: html[url as keyof typeof html] || '', finalUrl: url }),
    });
    assert.equal(result.urls.length, 2);
    assert.ok(result.urls.every((url) => sameDomain(url, 'https://site.test/')));
    assert.equal(shouldSkipHref('mailto:hi@x.com'), true);
    assert.equal(looksLikeInfiniteList('https://site.test/?page=2&date=2020&filter=1&sort=x'), true);
  });
});

describe('seo rules', () => {
  const missing = extractPage('<html><body><p>Hi</p></body></html>', 'https://site.test/', 200);
  it('flags missing title description h1', () => {
    const codes = seoFindingsForPage(missing).map((item) => item.rule_code);
    assert.ok(codes.includes('seo.missing_title'));
    assert.ok(codes.includes('seo.missing_description'));
    assert.ok(codes.includes('seo.missing_h1'));
  });
  it('flags duplicate title and multiple h1', () => {
    const html = '<html lang="en"><head><title>Same</title><meta name="description" content="desc"><link rel="canonical" href="https://site.test/"></head><body><h1>One</h1><h1>Two</h1><img src="/x.png"></body></html>';
    const page = extractPage(html, 'https://site.test/a', 200);
    assert.ok(seoFindingsForPage(page).some((item) => item.rule_code === 'seo.multiple_h1'));
    const other = extractPage(html, 'https://site.test/b', 200);
    const site = siteSeoFindings([page, other], { robots: false, sitemap: false });
    assert.ok(site.some((item) => item.rule_code === 'seo.duplicate_title'));
    assert.ok(site.some((item) => item.rule_code === 'seo.robots_missing'));
  });
  it('flags noindex canonical alt', () => {
    const html = '<html><head><title>Long enough title here</title><meta name="robots" content="noindex"></head><body><h1>H</h1><img src="/a.png"></body></html>';
    const codes = seoFindingsForPage(extractPage(html, 'https://site.test/', 200)).map((item) => item.rule_code);
    assert.ok(codes.includes('seo.noindex'));
    assert.ok(codes.includes('seo.missing_canonical'));
    assert.ok(codes.includes('seo.missing_image_alt'));
  });
});

describe('accessibility fixtures', () => {
  it('detects missing label empty button invalid aria and missing alt', () => {
    const html = '<html><body><button></button><form><input name="email"></form><div aria-invalidname="x"></div><img src="/p.png"><a href="/x">click here</a></body></html>';
    const page = extractPage(html, 'https://site.test/', 200);
    const codes = accessibilityFindings(page, html).map((item) => item.rule_code);
    assert.ok(codes.includes('a11y.empty_button'));
    assert.ok(codes.includes('a11y.missing_label'));
    assert.ok(codes.includes('a11y.invalid_aria'));
    assert.ok(codes.includes('a11y.link_text'));
  });
});

describe('typography scoring dedupe compare', () => {
  it('aggregates fonts and finds outliers', () => {
    const samples = [
      ...Array.from({ length: 12 }, (_, i) => ({ selector: `p${i}`, family: 'Inter', size: '18px', weight: '400', tag: 'p' })),
      { selector: 'p-odd', family: 'Inter', size: '15px', weight: '400', tag: 'p' },
      { selector: 'h1', family: 'Inter', size: '32px', weight: '700', tag: 'h1' },
      { selector: 'h2', family: 'Inter', size: '32px', weight: '700', tag: 'h2' },
    ];
    const profile = aggregateTypography(samples);
    const findings = typographyFindings(profile, 'https://site.test/');
    assert.ok(findings.some((item) => item.rule_code === 'ui.font_size_outlier'));
    assert.ok(findings.some((item) => item.rule_code === 'ui.heading_style'));
  });
  it('scores with caps and weights', () => {
    const findings = [
      { rule_code: 'seo.missing_h1', category: 'seo' as const, severity: 'medium' as const, title: 'a', description: '', recommendation: '', source: 'SYSTEM' as const, page_url: '/a' },
      { rule_code: 'seo.missing_h1', category: 'seo' as const, severity: 'medium' as const, title: 'a', description: '', recommendation: '', source: 'SYSTEM' as const, page_url: '/a' },
    ];
    const scores = categoryScores(findings);
    assert.equal(scores.seo, 94);
    const overall = overallScore({ ...scores, seo: 0, accessibility: 100, performance: 100, ui: 100, ux: 100, responsive: 100, content: 100, forms: 100 });
    assert.ok(overall >= 0 && overall <= 100);
  });
  it('merges identical site-wide findings', () => {
    const merged = dedupeFindings([
      { rule_code: 'ui.button_height', category: 'ui', severity: 'low', title: 'Button', description: 'x', recommendation: 'y', source: 'SYSTEM', page_url: '/a' },
      { rule_code: 'ui.button_height', category: 'ui', severity: 'low', title: 'Button', description: 'x', recommendation: 'y', source: 'SYSTEM', page_url: '/b' },
    ]);
    assert.equal(merged.length, 1);
  });
  it('keeps page-specific fingerprints', () => {
    const a = { rule_code: 'seo.missing_h1', category: 'seo' as const, severity: 'medium' as const, title: 't', description: '', recommendation: '', source: 'SYSTEM' as const, page_url: '/a' };
    const b = { ...a, page_url: '/b' };
    assert.notEqual(fingerprintOf(a), fingerprintOf(b));
  });
  it('compares fixed remaining new', () => {
    const prev = [{ fingerprint: '1', rule_code: 'a', title: 'a', severity: 'high' }, { fingerprint: '2', rule_code: 'b', title: 'b', severity: 'low' }];
    const next = [{ fingerprint: '2', rule_code: 'b', title: 'b', severity: 'low' }, { fingerprint: '3', rule_code: 'c', title: 'c', severity: 'medium' }];
    const result = compareFindings(prev, next);
    assert.equal(result.fixed_count, 1);
    assert.equal(result.remaining_count, 1);
    assert.equal(result.new_count, 1);
    assert.equal(scoreDelta(72, 87).difference, 15);
  });
});

describe('forms', () => {
  it('validates empty required and email without submitting', () => {
    assert.equal(validateField('text', '', true), 'required');
    assert.equal(validateField('email', 'nope', false), 'email');
    const payment = { action: '/pay', method: 'post', inputs: [{ name: 'card', type: 'text', required: true, label: 'Card' }], looksPayment: true, looksAuth: false, looksDestructive: false };
    assert.equal(isSafeToProbe(payment), false);
    assert.equal(neverSubmitReason(payment), 'payment');
    const safe = formFindings([{ action: '/c', method: 'post', inputs: [{ name: 'email', type: 'email', required: true, label: 'Email' }], looksPayment: false, looksAuth: false, looksDestructive: false }], 'https://site.test/contact', 'safe');
    assert.ok(safe.length >= 1);
  });
});

describe('ai mock', () => {
  it('parses valid json and rejects malformed', () => {
    const ok = parseAiFindings(JSON.stringify({ findings: [{ category: 'ui', severity: 'medium', title: 'Gap', description: 'd', recommendation: 'r', confidence: 0.9 }] }), 'https://x.com', 0.6);
    assert.equal(ok.length, 1);
    assert.equal(parseAiFindings('not-json', 'https://x.com', 0.6).length, 0);
    const low = parseAiFindings(JSON.stringify({ findings: [{ category: 'ux', severity: 'medium', title: 'Maybe', description: 'd', recommendation: 'r', confidence: 0.2 }] }), 'https://x.com', 0.6);
    assert.equal(low[0].rule_code, 'ai.review_recommended');
    assert.equal(selectAiPages([{ url: '/a', pageType: 'home', layoutAnomaly: false }, { url: '/b', pageType: 'other', layoutAnomaly: true }], 1)[0].pageType, 'home');
  });
});

describe('performance adapter', () => {
  it('maps lighthouse-like summaries without live runs', () => {
    const findings = performanceFindings({
      performanceScore: 40, accessibilityScore: null, bestPracticesScore: null, seoScore: null,
      lcp: 7000, cls: 0.3, tbt: 400, fcp: 3000, speedIndex: null,
      largeResources: [{ url: 'https://x/a.jpg', bytes: 900000, type: 'image' }],
      renderBlocking: ['app.css'],
    }, 'https://site.test/');
    assert.ok(findings.some((item) => item.rule_code === 'perf.lcp'));
    assert.ok(findings.some((item) => item.rule_code === 'perf.large_image'));
  });
});

describe('html extract', () => {
  it('extracts internal links only', () => {
    const links = extractLinks('<a href="/ok">ok</a><a href="https://evil.test">x</a><a href="javascript:void(0)">j</a>', 'https://site.test/');
    assert.deepEqual(links, ['https://site.test/ok']);
  });
});

describe('local fixtures', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
  it('good fixture has no missing title or h1', () => {
    const html = readFileSync(join(dir, 'good.html'), 'utf8');
    const page = extractPage(html, 'https://site.test/', 200);
    const codes = seoFindingsForPage(page).map((item) => item.rule_code);
    assert.ok(!codes.includes('seo.missing_title'));
    assert.ok(!codes.includes('seo.missing_h1'));
  });
  it('bad fixture reports seo and a11y issues', () => {
    const html = readFileSync(join(dir, 'bad.html'), 'utf8');
    const page = extractPage(html, 'https://site.test/contact', 200);
    const codes = [...seoFindingsForPage(page), ...accessibilityFindings(page, html), ...formFindings(page.forms, page.normalizedUrl, 'safe')].map((item) => item.rule_code);
    assert.ok(codes.includes('seo.missing_title'));
    assert.ok(codes.includes('a11y.empty_button'));
    assert.ok(neverSubmitReason(page.forms[0]) === 'auth');
  });
});
