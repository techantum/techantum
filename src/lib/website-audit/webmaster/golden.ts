import type { FindingDraft } from '../types';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type GoldenCase = {
  key: string;
  title: string;
  url: string;
  html: string;
  layoutAnomaly?: boolean;
  skipAi?: boolean;
  deterministic?: FindingDraft[];
  mock_ai?: Record<string, unknown>[];
  expected_rule_parts: string[];
};

function fixture(name: string) {
  try {
    return readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', name), 'utf8');
  } catch {
    return '';
  }
}

const GOOD = fixture('good.html') || '<html lang="en"><head><title>Quality software for teams</title></head><body><h1>Quality</h1></body></html>';
const BAD = fixture('bad.html') || '<html><body><button></button><h1></h1><img src="/x.png"><p>Lorem ipsum</p></body></html>';

export const GOLDEN_CASES: GoldenCase[] = [
  {
    key: 'good-website',
    title: 'Good website',
    url: 'https://site.test/',
    html: GOOD,
    skipAi: true,
    expected_rule_parts: [],
  },
  {
    key: 'missing-seo',
    title: 'Missing SEO',
    url: 'https://site.test/seo',
    html: '<html><body><p>Hello</p></body></html>',
    skipAi: true,
    expected_rule_parts: ['seo.missing_title', 'seo.missing_h1'],
    deterministic: [
      { rule_code: 'seo.missing_title', category: 'seo', severity: 'high', title: 'Missing page title', description: 'no title', recommendation: 'add title', source: 'SYSTEM', page_url: 'https://site.test/seo' },
      { rule_code: 'seo.missing_h1', category: 'seo', severity: 'medium', title: 'Missing H1', description: 'no h1', recommendation: 'add h1', source: 'SYSTEM', page_url: 'https://site.test/seo' },
    ],
  },
  {
    key: 'bad-mobile',
    title: 'Bad mobile',
    url: 'https://site.test/mobile',
    html: GOOD,
    layoutAnomaly: true,
    skipAi: true,
    deterministic: [{ rule_code: 'responsive.horizontal_overflow', category: 'responsive', severity: 'high', title: 'Horizontal overflow', description: 'wider than viewport', recommendation: 'fix overflow', source: 'SYSTEM', page_url: 'https://site.test/mobile', viewport: 'mobile' }],
    expected_rule_parts: ['responsive.horizontal_overflow'],
  },
  {
    key: 'typography',
    title: 'Typography inconsistency',
    url: 'https://site.test/type',
    html: GOOD,
    mock_ai: [{ category: 'ui', finding_type: 'best_practice', severity: 'low', title: 'H2 size outlier', description: 'Most H2s are 32px/600; one is 26px/400 without a named component.', recommendation: 'Align H2 to the type scale.', confidence: 0.82, standard_reference: { name: 'Techantum Web Quality Standard', rule: 'UI-TYPO-001' } }],
    expected_rule_parts: ['ui'],
  },
  {
    key: 'forms',
    title: 'Form problems',
    url: 'https://site.test/contact',
    html: BAD,
    skipAi: true,
    deterministic: [{ rule_code: 'a11y.missing_label', category: 'accessibility', severity: 'high', title: 'Form fields missing labels', description: 'unlabeled', recommendation: 'add labels', source: 'ACCESSIBILITY', page_url: 'https://site.test/contact' }],
    expected_rule_parts: ['a11y.missing_label'],
  },
  {
    key: 'broken-links',
    title: 'Broken links',
    url: 'https://site.test/links',
    html: GOOD,
    skipAi: true,
    deterministic: [{ rule_code: 'seo.broken_internal_link', category: 'seo', severity: 'high', title: 'Broken internal links', description: '404', recommendation: 'fix links', source: 'SYSTEM', page_url: 'https://site.test/links' }],
    expected_rule_parts: ['seo.broken_internal_link'],
  },
  {
    key: 'accessibility',
    title: 'Accessibility issue',
    url: 'https://site.test/a11y',
    html: BAD,
    skipAi: true,
    deterministic: [{ rule_code: 'a11y.empty_button', category: 'accessibility', severity: 'high', title: 'Empty buttons', description: 'unnamed', recommendation: 'add name', source: 'ACCESSIBILITY', page_url: 'https://site.test/a11y' }],
    expected_rule_parts: ['a11y.empty_button'],
  },
  {
    key: 'slow-page',
    title: 'Slow page',
    url: 'https://site.test/slow',
    html: GOOD,
    skipAi: true,
    deterministic: [{ rule_code: 'perf.lcp', category: 'performance', severity: 'high', title: 'LCP is slow', description: 'LCP 7000ms', recommendation: 'optimize hero', source: 'LIGHTHOUSE', page_url: 'https://site.test/slow' }],
    expected_rule_parts: ['perf.lcp'],
  },
  {
    key: 'image-relevance',
    title: 'Bad image relevance',
    url: 'https://site.test/images',
    html: GOOD,
    mock_ai: [{ category: 'ux', finding_type: 'ai_recommendation', severity: 'suggestion', title: 'Hero image may not match services copy', description: 'Hero shows unrelated stock photography.', recommendation: 'Use a service-relevant hero.', confidence: 0.7, standard_reference: { name: 'AI Recommendation' } }],
    expected_rule_parts: ['ai_recommendation', 'image'],
  },
  {
    key: 'placeholder',
    title: 'Placeholder content',
    url: 'https://site.test/lorem',
    html: BAD,
    skipAi: true,
    deterministic: [{ rule_code: 'content.placeholder', category: 'content', severity: 'medium', title: 'Placeholder copy detected', description: 'lorem ipsum', recommendation: 'replace copy', source: 'SYSTEM', page_url: 'https://site.test/lorem' }],
    expected_rule_parts: ['content.placeholder'],
  },
  {
    key: 'excellent',
    title: 'Excellent quality page',
    url: 'https://site.test/excellent',
    html: GOOD,
    mock_ai: [],
    expected_rule_parts: [],
  },
  {
    key: 'intentional-buttons',
    title: 'Intentional secondary button style',
    url: 'https://site.test/buttons',
    html: GOOD,
    mock_ai: [],
    expected_rule_parts: [],
  },
];
