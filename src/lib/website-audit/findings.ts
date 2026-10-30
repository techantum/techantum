import { createHash } from 'crypto';
import type { FindingDraft } from './types';

export function fingerprintOf(finding: FindingDraft): string {
  const url = (finding.page_url || '').replace(/\/$/, '');
  const selector = finding.selector || '';
  return createHash('sha1')
    .update([finding.rule_code, url, selector, finding.viewport || ''].join('|'))
    .digest('hex');
}

const MERGEABLE = new Set([
  'ui.too_many_fonts',
  'ui.font_size_outlier',
  'ui.button_height',
  'ui.heading_style',
  'seo.missing_image_alt',
  'a11y.link_text',
  'a11y.landmarks',
  'seo.missing_open_graph',
]);

export function dedupeFindings(findings: FindingDraft[]): FindingDraft[] {
  const byKey = new Map<string, FindingDraft & { affected_urls?: string[] }>();
  for (const finding of findings) {
    const merge = MERGEABLE.has(finding.rule_code);
    const key = merge
      ? `${finding.rule_code}|${finding.viewport || ''}`
      : fingerprintOf(finding);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...finding, affected_urls: finding.page_url ? [finding.page_url] : [] });
      continue;
    }
    const urls = new Set([...(current.affected_urls || []), finding.page_url].filter(Boolean) as string[]);
    current.affected_urls = [...urls];
    const instances = [
      ...((current.evidence?.instances as unknown[]) || []),
      ...((finding.evidence?.instances as unknown[]) || []),
    ].slice(0, 40);
    current.evidence = { ...(current.evidence || {}), ...(finding.evidence || {}), urls: [...urls], instances };
    if (urls.size > 1) {
      current.title = current.title.replace(/ across \d+ pages$/, '');
      const first = (instances[0] as { selector?: string } | undefined)?.selector || current.selector || current.rule_code;
      current.description = `${first} also appears on ${urls.size} pages: ${[...urls].slice(0, 4).join(', ')}${urls.size > 4 ? '…' : ''}.`;
    }
  }
  return [...byKey.values()];
}

export function contentHash(html: string): string {
  return createHash('sha256').update(html).digest('hex');
}
