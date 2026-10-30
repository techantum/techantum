import type { FindingDraft, LayoutSignals } from './types';

export function layoutFindings(signals: LayoutSignals, pageUrl: string, viewport: string): FindingDraft[] {
  const findings: FindingDraft[] = [];
  if (signals.overflowX || signals.bodyWiderThanViewport) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'responsive.horizontal_overflow',
      category: 'responsive',
      severity: viewport === 'mobile' ? 'high' : 'medium',
      title: 'Horizontal page overflow',
      description: `${pageUrl} is wider than the ${viewport} viewport.`,
      recommendation: 'Fix overflowing elements and constrain width to the viewport.',
      page_url: pageUrl,
      viewport,
      evidence: { bodyWiderThanViewport: signals.bodyWiderThanViewport, overflowX: signals.overflowX },
    });
  }
  if (signals.clippedCount > 0) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'ui.clipped_elements',
      category: 'ui',
      severity: 'medium',
      title: 'Elements clipped by containers',
      description: `${signals.clippedCount} element(s) appear clipped on ${pageUrl}.`,
      recommendation: 'Check overflow hidden containers and text wrapping.',
      page_url: pageUrl,
      viewport,
    });
  }
  if (signals.overlappingCount > 2) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'ui.overlapping',
      category: 'ui',
      severity: 'medium',
      title: 'Overlapping elements',
      description: `${signals.overlappingCount} overlapping pairs were detected on ${pageUrl}.`,
      recommendation: 'Review stacking and spacing on this template.',
      page_url: pageUrl,
      viewport,
    });
  }
  if (signals.buttonHeightVariance > 12) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'ui.button_height',
      category: 'ui',
      severity: 'low',
      title: 'Inconsistent button heights',
      description: `Primary buttons on ${pageUrl} differ by ${Math.round(signals.buttonHeightVariance)}px.`,
      recommendation: 'Use a shared button component height.',
      page_url: pageUrl,
      viewport,
    });
  }
  return findings;
}

export function browserFindings(pageUrl: string, consoleErrors: string[], failedRequests: { url: string; status: number }[]): FindingDraft[] {
  const findings: FindingDraft[] = [];
  if (consoleErrors.length) {
    findings.push({
      source: 'BROWSER',
      rule_code: 'browser.console_errors',
      category: 'ux',
      severity: consoleErrors.length > 5 ? 'high' : 'medium',
      title: 'Browser console errors',
      description: `${consoleErrors.length} console error(s) on ${pageUrl}.`,
      recommendation: 'Fix JavaScript exceptions shown in the browser console.',
      page_url: pageUrl,
      evidence: { samples: consoleErrors.slice(0, 8) },
    });
  }
  if (failedRequests.length) {
    findings.push({
      source: 'BROWSER',
      rule_code: 'browser.failed_requests',
      category: 'performance',
      severity: failedRequests.some((item) => item.status >= 500) ? 'high' : 'medium',
      title: 'Failed network requests',
      description: `${failedRequests.length} request(s) failed while loading ${pageUrl}.`,
      recommendation: 'Repair broken assets and API calls.',
      page_url: pageUrl,
      evidence: { samples: failedRequests.slice(0, 8) },
    });
  }
  return findings;
}

export function brokenInternalLinks(pageUrl: string, broken: { href: string; status: number }[]): FindingDraft[] {
  if (!broken.length) return [];
  return [{
    source: 'SYSTEM',
    rule_code: 'seo.broken_internal_link',
    category: 'seo',
    severity: 'high',
    title: 'Broken internal links',
    description: `${broken.length} internal link(s) from ${pageUrl} returned an error.`,
    recommendation: 'Update or remove links that return 4xx/5xx.',
    page_url: pageUrl,
    evidence: { links: broken.slice(0, 10) },
  }];
}

export function brokenImages(pageUrl: string, broken: string[]): FindingDraft[] {
  if (!broken.length) return [];
  return [{
    source: 'BROWSER',
    rule_code: 'browser.broken_image',
    category: 'ux',
    severity: 'medium',
    title: 'Broken image URLs',
    description: `${broken.length} image(s) failed to load on ${pageUrl}.`,
    recommendation: 'Replace missing image files or update the src.',
    page_url: pageUrl,
    evidence: { samples: broken.slice(0, 8) },
  }];
}
