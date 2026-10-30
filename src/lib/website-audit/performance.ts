import type { FindingDraft, PerformanceSummary } from './types';

export function performanceFindings(summary: PerformanceSummary, pageUrl: string): FindingDraft[] {
  const findings: FindingDraft[] = [];
  if (summary.lcp && summary.lcp > 4000) {
    findings.push({
      source: 'LIGHTHOUSE',
      rule_code: 'perf.lcp',
      category: 'performance',
      severity: summary.lcp > 6000 ? 'high' : 'medium',
      title: 'Largest Contentful Paint is slow',
      description: `LCP is ${Math.round(summary.lcp)}ms on ${pageUrl}.`,
      recommendation: 'Optimize hero images and reduce render-blocking resources.',
      page_url: pageUrl,
      evidence: { lcp: summary.lcp },
    });
  }
  if (summary.cls && summary.cls > 0.1) {
    findings.push({
      source: 'LIGHTHOUSE',
      rule_code: 'perf.cls',
      category: 'performance',
      severity: summary.cls > 0.25 ? 'high' : 'medium',
      title: 'Layout shift is high',
      description: `CLS is ${summary.cls.toFixed(2)} on ${pageUrl}.`,
      recommendation: 'Reserve image/ad sizes and avoid late font swaps.',
      page_url: pageUrl,
      evidence: { cls: summary.cls },
    });
  }
  if (summary.tbt && summary.tbt > 300) {
    findings.push({
      source: 'LIGHTHOUSE',
      rule_code: 'perf.tbt',
      category: 'performance',
      severity: 'medium',
      title: 'Main thread is busy',
      description: `Total blocking time is ${Math.round(summary.tbt)}ms.`,
      recommendation: 'Split long JavaScript tasks and defer non-critical scripts.',
      page_url: pageUrl,
      evidence: { tbt: summary.tbt },
    });
  }
  for (const resource of summary.largeResources.slice(0, 5)) {
    if (resource.bytes > 500_000) {
      findings.push({
        source: 'LIGHTHOUSE',
        rule_code: resource.type.startsWith('image') ? 'perf.large_image' : 'perf.large_resource',
        category: 'performance',
        severity: 'low',
        title: resource.type.startsWith('image') ? 'Large image' : 'Large resource',
        description: `${resource.url} is ${(resource.bytes / 1024).toFixed(0)}KB.`,
        recommendation: 'Compress, resize, or lazy-load this asset.',
        page_url: pageUrl,
        evidence: resource,
      });
    }
  }
  if (summary.renderBlocking.length) {
    findings.push({
      source: 'LIGHTHOUSE',
      rule_code: 'perf.render_blocking',
      category: 'performance',
      severity: 'low',
      title: 'Render-blocking resources',
      description: `${summary.renderBlocking.length} render-blocking file(s) on ${pageUrl}.`,
      recommendation: 'Defer non-critical CSS/JS.',
      page_url: pageUrl,
      evidence: { samples: summary.renderBlocking.slice(0, 6) },
    });
  }
  return findings;
}

export function lighthouseFromTimings(input: {
  lcp?: number | null;
  fcp?: number | null;
  cls?: number | null;
  tbt?: number | null;
  transferSize?: number | null;
}): PerformanceSummary {
  const lcp = input.lcp ?? null;
  let performanceScore = 90;
  if (lcp && lcp > 2500) performanceScore -= 15;
  if (lcp && lcp > 4000) performanceScore -= 20;
  if ((input.cls || 0) > 0.1) performanceScore -= 15;
  return {
    performanceScore: Math.max(0, performanceScore),
    accessibilityScore: null,
    bestPracticesScore: null,
    seoScore: null,
    lcp,
    cls: input.cls ?? null,
    tbt: input.tbt ?? null,
    fcp: input.fcp ?? null,
    speedIndex: null,
    largeResources: [],
    renderBlocking: [],
  };
}
