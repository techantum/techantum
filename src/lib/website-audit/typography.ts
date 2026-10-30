import type { FindingDraft, TypographyProfile } from './types';

export function emptyTypography(): TypographyProfile {
  return { fontFamilies: {}, fontSizes: {}, fontWeights: {}, headingStyles: {}, bodySize: null, outliers: [] };
}

export function aggregateTypography(samples: { selector: string; family: string; size: string; weight: string; tag: string }[]): TypographyProfile {
  const profile = emptyTypography();
  const sizeCounts = new Map<string, number>();
  for (const sample of samples) {
    const family = sample.family.split(',')[0].replace(/['"]/g, '').trim() || 'unknown';
    profile.fontFamilies[family] = (profile.fontFamilies[family] || 0) + 1;
    profile.fontSizes[sample.size] = (profile.fontSizes[sample.size] || 0) + 1;
    profile.fontWeights[sample.weight] = (profile.fontWeights[sample.weight] || 0) + 1;
    sizeCounts.set(sample.size, (sizeCounts.get(sample.size) || 0) + 1);
    if (/^h[1-3]$/i.test(sample.tag)) {
      const key = sample.tag.toLowerCase();
      const current = profile.headingStyles[key];
      if (!current) profile.headingStyles[key] = { size: sample.size, family, weight: sample.weight, count: 1 };
      else current.count += 1;
    }
  }
  const paragraphSizes = samples.filter((item) => item.tag === 'p');
  if (paragraphSizes.length) {
    const tally = new Map<string, number>();
    for (const item of paragraphSizes) tally.set(item.size, (tally.get(item.size) || 0) + 1);
    profile.bodySize = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const total = paragraphSizes.length;
    for (const item of paragraphSizes) {
      const share = (tally.get(item.size) || 0) / total;
      if (profile.bodySize && item.size !== profile.bodySize && share < 0.08) {
        profile.outliers.push({ selector: item.selector, size: item.size, family: item.family });
      }
    }
  }
  return profile;
}

export function typographyFindings(profile: TypographyProfile, pageUrl: string): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const families = Object.keys(profile.fontFamilies);
  if (families.length > 4) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'ui.too_many_fonts',
      category: 'ui',
      severity: 'medium',
      title: 'Too many font families',
      description: `${families.length} font families were detected on ${pageUrl}: ${families.join(', ')}.`,
      recommendation: 'Limit the site to 2–3 typefaces.',
      page_url: pageUrl,
      evidence: { families: profile.fontFamilies },
    });
  }
  if (profile.outliers.length) {
    const body = profile.bodySize;
    const odd = profile.outliers[0];
    const totalParagraphHint = Object.values(profile.fontSizes).reduce((sum, n) => sum + n, 0);
    findings.push({
      source: 'SYSTEM',
      rule_code: 'ui.font_size_outlier',
      category: 'ui',
      severity: 'low',
      title: 'Inconsistent body font size',
      description: `${body} body text is dominant, but ${profile.outliers.length} text block(s) use ${odd.size} without an identified component reason.`,
      recommendation: 'Align one-off sizes to the type scale or document them as component-specific.',
      page_url: pageUrl,
      evidence: { bodySize: body, outliers: profile.outliers.slice(0, 8), sampled: totalParagraphHint },
    });
  }
  const h1 = profile.headingStyles.h1;
  const h2 = profile.headingStyles.h2;
  if (h1 && h2 && h1.size === h2.size) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'ui.heading_style',
      category: 'ui',
      severity: 'low',
      title: 'H1 and H2 share the same size',
      description: `H1 and H2 both use ${h1.size} on ${pageUrl}.`,
      recommendation: 'Give heading levels a clear visual hierarchy.',
      page_url: pageUrl,
    });
  }
  const tiny = Object.keys(profile.fontSizes).filter((size) => Number.parseFloat(size) > 0 && Number.parseFloat(size) < 12);
  if (tiny.length) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'responsive.tiny_text',
      category: 'responsive',
      severity: 'medium',
      title: 'Very small text detected',
      description: `Text smaller than 12px was found (${tiny.join(', ')}).`,
      recommendation: 'Keep body text at least 14–16px on mobile.',
      page_url: pageUrl,
      viewport: 'mobile',
    });
  }
  return findings;
}
