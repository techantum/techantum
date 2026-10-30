import type { ExtractedPage, FindingDraft } from './types';
import { sameDomain } from './url';

function finding(partial: Omit<FindingDraft, 'source'> & { source?: FindingDraft['source'] }): FindingDraft {
  return { source: 'SYSTEM', ...partial };
}

export function seoFindingsForPage(page: ExtractedPage): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const url = page.normalizedUrl;
  if (!page.title) {
    findings.push(finding({
      rule_code: 'seo.missing_title',
      category: 'seo',
      severity: 'high',
      title: 'Missing page title',
      description: `${url} has no <title> tag.`,
      recommendation: 'Add a unique descriptive title between 30 and 60 characters.',
      page_url: url,
    }));
  } else {
    if (page.title.length < 15) {
      findings.push(finding({
        rule_code: 'seo.title_too_short',
        category: 'seo',
        severity: 'low',
        title: 'Title is too short',
        description: `"${page.title}" is ${page.title.length} characters.`,
        recommendation: 'Expand the title to describe the page clearly.',
        page_url: url,
      }));
    }
    if (page.title.length > 65) {
      findings.push(finding({
        rule_code: 'seo.title_too_long',
        category: 'seo',
        severity: 'low',
        title: 'Title is too long',
        description: `"${page.title}" is ${page.title.length} characters and may truncate in search results.`,
        recommendation: 'Keep titles around 50–60 characters.',
        page_url: url,
      }));
    }
  }
  if (!page.metaDescription) {
    findings.push(finding({
      rule_code: 'seo.missing_description',
      category: 'seo',
      severity: 'medium',
      title: 'Missing meta description',
      description: `${url} has no meta description.`,
      recommendation: 'Add a unique 120–160 character description.',
      page_url: url,
    }));
  }
  if (!page.h1.length) {
    findings.push(finding({
      rule_code: 'seo.missing_h1',
      category: 'seo',
      severity: 'medium',
      title: 'Missing H1',
      description: `${url} has no H1 heading.`,
      recommendation: 'Add one H1 that matches the page intent.',
      page_url: url,
      selector: 'h1',
    }));
  }
  if (page.h1.length > 1) {
    findings.push(finding({
      rule_code: 'seo.multiple_h1',
      category: 'seo',
      severity: 'low',
      title: 'Multiple H1 headings',
      description: `${url} has ${page.h1.length} H1 headings: ${page.h1.join(' | ')}.`,
      recommendation: 'Use a single H1 per page.',
      page_url: url,
      selector: 'h1',
    }));
  }
  let lastLevel = 0;
  for (const heading of page.headings) {
    if (lastLevel && heading.level > lastLevel + 1) {
      findings.push(finding({
        rule_code: 'seo.heading_hierarchy',
        category: 'seo',
        severity: 'low',
        title: 'Heading hierarchy skipped a level',
        description: `Found H${heading.level} after H${lastLevel} on ${url}.`,
        recommendation: 'Keep heading levels sequential (H1 → H2 → H3).',
        page_url: url,
        selector: `h${heading.level}`,
      }));
      break;
    }
    lastLevel = heading.level;
  }
  if (!page.canonical) {
    findings.push(finding({
      rule_code: 'seo.missing_canonical',
      category: 'seo',
      severity: 'low',
      title: 'Missing canonical URL',
      description: `${url} does not declare a canonical link.`,
      recommendation: 'Add <link rel="canonical"> to the preferred URL.',
      page_url: url,
    }));
  }
  if (/\bnoindex\b/i.test(page.robots)) {
    findings.push(finding({
      rule_code: 'seo.noindex',
      category: 'seo',
      severity: page.pageType === 'home' ? 'high' : 'medium',
      title: 'Page is marked noindex',
      description: `${url} includes robots noindex.`,
      recommendation: 'Remove noindex on pages that should appear in search.',
      page_url: url,
    }));
  }
  const missingAlt = page.images.filter((image) => image.alt === null && image.src);
  if (missingAlt.length) {
    findings.push(finding({
      rule_code: 'seo.missing_image_alt',
      category: 'seo',
      severity: 'medium',
      title: 'Images missing ALT text',
      description: `${missingAlt.length} image(s) on ${url} have no alt attribute.`,
      recommendation: 'Add descriptive ALT text, or empty alt for decorative images.',
      page_url: url,
      selector: 'img',
      evidence: { count: missingAlt.length, samples: missingAlt.slice(0, 5).map((item) => item.src) },
    }));
  }
  if (!page.openGraph['og:title'] || !page.openGraph['og:description']) {
    findings.push(finding({
      rule_code: 'seo.missing_open_graph',
      category: 'seo',
      severity: 'low',
      title: 'Missing Open Graph metadata',
      description: `${url} is missing basic og:title or og:description.`,
      recommendation: 'Add Open Graph tags for social sharing.',
      page_url: url,
    }));
  }
  if (page.normalizedUrl.startsWith('http://')) {
    findings.push(finding({
      rule_code: 'seo.https',
      category: 'seo',
      severity: 'high',
      title: 'Page is not served over HTTPS',
      description: url,
      recommendation: 'Redirect HTTP to HTTPS.',
      page_url: url,
    }));
  }
  if (page.httpStatus && page.httpStatus >= 400) {
    findings.push(finding({
      rule_code: 'seo.http_error',
      category: 'seo',
      severity: page.httpStatus >= 500 ? 'critical' : 'high',
      title: `HTTP ${page.httpStatus}`,
      description: `${url} returned ${page.httpStatus}.`,
      recommendation: 'Fix the response so users and crawlers can reach the page.',
      page_url: url,
      source: 'BROWSER',
    }));
  }
  const emptyHeadings = page.headings.filter((item) => !item.text.trim());
  if (emptyHeadings.length) {
    findings.push(finding({
      rule_code: 'content.empty_heading',
      category: 'content',
      severity: 'low',
      title: 'Empty heading',
      description: `${url} has ${emptyHeadings.length} empty heading(s).`,
      recommendation: 'Remove empty headings or add meaningful text.',
      page_url: url,
    }));
  }
  if (/lorem ipsum|placeholder text|your text here|coming soon/i.test(page.visibleText)) {
    findings.push(finding({
      rule_code: 'content.placeholder',
      category: 'content',
      severity: 'medium',
      title: 'Placeholder copy detected',
      description: `${url} still contains placeholder or lorem ipsum text.`,
      recommendation: 'Replace placeholder copy before launch.',
      page_url: url,
    }));
  }
  return findings;
}

export function siteSeoFindings(pages: ExtractedPage[], extras: { robots: boolean; sitemap: boolean }): FindingDraft[] {
  const findings: FindingDraft[] = [];
  if (!extras.robots) {
    findings.push(finding({
      rule_code: 'seo.robots_missing',
      category: 'seo',
      severity: 'medium',
      title: 'robots.txt was not found',
      description: 'The site did not return a robots.txt file.',
      recommendation: 'Publish a robots.txt that allows public pages and points to the sitemap.',
    }));
  }
  if (!extras.sitemap) {
    findings.push(finding({
      rule_code: 'seo.sitemap_missing',
      category: 'seo',
      severity: 'medium',
      title: 'sitemap.xml was not found',
      description: 'The site did not return a sitemap.xml file.',
      recommendation: 'Publish an XML sitemap and reference it from robots.txt.',
    }));
  }
  const byTitle = new Map<string, string[]>();
  const byDesc = new Map<string, string[]>();
  for (const page of pages) {
    if (page.title) {
      const key = page.title.trim().toLowerCase();
      byTitle.set(key, [...(byTitle.get(key) || []), page.normalizedUrl]);
    }
    if (page.metaDescription) {
      const key = page.metaDescription.trim().toLowerCase();
      byDesc.set(key, [...(byDesc.get(key) || []), page.normalizedUrl]);
    }
  }
  for (const [title, urls] of byTitle) {
    if (urls.length > 1) {
      findings.push(finding({
        rule_code: 'seo.duplicate_title',
        category: 'seo',
        severity: 'medium',
        title: 'Duplicate page titles',
        description: `"${title}" is used on ${urls.length} pages.`,
        recommendation: 'Give each page a unique title.',
        evidence: { urls },
      }));
    }
  }
  for (const [desc, urls] of byDesc) {
    if (urls.length > 1) {
      findings.push(finding({
        rule_code: 'seo.duplicate_description',
        category: 'seo',
        severity: 'medium',
        title: 'Duplicate meta descriptions',
        description: `The same description is used on ${urls.length} pages.`,
        recommendation: 'Write a unique meta description per page.',
        evidence: { urls },
      }));
    }
  }
  const linked = new Set<string>();
  const origin = pages[0]?.normalizedUrl || '';
  for (const page of pages) {
    for (const link of page.links) {
      if (link.internal && sameDomain(link.href, origin)) linked.add(link.href.replace(/\/$/, ''));
    }
  }
  if (pages.length > 1) {
    const orphans = pages.filter((page) => {
      const path = page.normalizedUrl.replace(/\/$/, '');
      const isHome = new URL(page.normalizedUrl).pathname === '/' || new URL(page.normalizedUrl).pathname === '';
      return !isHome && ![...linked].some((href) => href.replace(/\/$/, '') === path);
    });
    if (orphans.length) {
      findings.push(finding({
        rule_code: 'seo.orphan_pages',
        category: 'seo',
        severity: 'low',
        title: 'Possible orphan pages',
        description: `${orphans.length} scanned page(s) were not linked from other scanned pages.`,
        recommendation: 'Add internal links so important pages are discoverable.',
        evidence: { urls: orphans.map((item) => item.normalizedUrl) },
      }));
    }
  }
  return findings;
}
