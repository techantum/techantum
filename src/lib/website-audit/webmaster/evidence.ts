import { sanitizeEvidence, sanitizeText } from './sanitize';
import type { ExtractedPage, FindingDraft, LayoutSignals, PerformanceSummary, TypographyProfile } from '../types';

export type PageEvidence = {
  page: { url: string; page_type: string; viewport: string };
  technical_findings: { rule_code: string; title: string; severity: string; source: string }[];
  seo_summary: Record<string, unknown>;
  accessibility_summary: Record<string, unknown>;
  performance_summary: Record<string, unknown>;
  typography_summary: Record<string, unknown>;
  layout_summary: Record<string, unknown>;
  form_summary: Record<string, unknown>;
  content_sample: { text: string };
  screenshot: { available: boolean; note: string };
};

export function buildPageEvidence(input: {
  page: ExtractedPage;
  viewport: string;
  findings: FindingDraft[];
  typography?: TypographyProfile | null;
  layout?: LayoutSignals | null;
  performance?: PerformanceSummary | null;
  hasScreenshot: boolean;
  maxChars: number;
}): PageEvidence {
  const findings = input.findings.filter((item) => !item.page_url || item.page_url === input.page.normalizedUrl);
  const evidence: PageEvidence = {
    page: { url: input.page.normalizedUrl, page_type: input.page.pageType, viewport: input.viewport },
    technical_findings: findings.slice(0, 15).map((item) => ({
      rule_code: item.rule_code,
      title: item.title,
      severity: item.severity,
      source: item.source,
    })),
    seo_summary: {
      title: input.page.title,
      title_length: input.page.title.length,
      description_length: input.page.metaDescription.length,
      h1_count: input.page.h1.length,
      canonical: Boolean(input.page.canonical),
      robots: input.page.robots || null,
      https: input.page.normalizedUrl.startsWith('https:'),
    },
    accessibility_summary: {
      lang: input.page.lang || null,
      unlabeled_inputs: input.page.forms.flatMap((form) => form.inputs.filter((field) => !field.label && !['hidden', 'submit'].includes(field.type))).length,
      image_missing_alt: input.page.images.filter((img) => img.alt === null).length,
    },
    performance_summary: input.performance
      ? { lcp: input.performance.lcp, cls: input.performance.cls, tbt: input.performance.tbt, fcp: input.performance.fcp }
      : {},
    typography_summary: input.typography
      ? { families: Object.keys(input.typography.fontFamilies), bodySize: input.typography.bodySize, outliers: input.typography.outliers.slice(0, 5) }
      : {},
    layout_summary: input.layout || {},
    form_summary: {
      count: input.page.forms.length,
      payment: input.page.forms.filter((form) => form.looksPayment).length,
      auth: input.page.forms.filter((form) => form.looksAuth).length,
    },
    content_sample: { text: sanitizeText(input.page.contentSample, input.maxChars) },
    screenshot: {
      available: input.hasScreenshot,
      note: input.hasScreenshot ? 'compressed screenshot available to reviewer UI; not inlined as raw pixels in this payload' : 'no screenshot',
    },
  };
  return sanitizeEvidence(evidence, input.maxChars) as PageEvidence;
}

export function templateHash(page: ExtractedPage): string {
  const outline = page.headings.map((item) => item.level).slice(0, 12).join('');
  const forms = String(page.forms.length);
  return `${page.pageType}:${outline}:${forms}`;
}
