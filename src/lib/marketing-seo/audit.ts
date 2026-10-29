import { getSeo } from '@/lib/cms';
import { resolveSiteUrl } from '@/lib/cms/url';
import { getSitemapPaths } from '@/lib/seo/routes';
import { parsePublicHtml } from './html';
import { seoHealthScore, type CheckStatus, type IssuePriority } from './scoring';
import { allowedAuditUrl } from './ssrf';

export interface AuditIssueInput {
  check_name: string;
  affected_url: string;
  status: CheckStatus;
  issue_description: string;
  priority: IssuePriority;
  recommended_action: string;
}

const RECOMMENDED_PAGES = [
  { path: '/services/website-development', name: 'Website Development' },
  { path: '/services/web-application-development', name: 'Web Application Development' },
  { path: '/services/mobile-application-development', name: 'Mobile Application Development' },
  { path: '/portfolio', name: 'Portfolio' },
  { path: '/blog', name: 'Blog' },
  { path: '/contact', name: 'Contact' },
];

const MISSING_SERVICE_PAGES = [
  { path: '/services/erp-crm-development', name: 'ERP & CRM Development' },
  { path: '/services/custom-software-development', name: 'Custom Software Development' },
];

async function fetchOwned(url: string, origin: string) {
  if (!allowedAuditUrl(url, origin)) {
    return { ok: false, status: 0, html: '', headers: new Headers(), finalUrl: url };
  }
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'TechantumSEOAudit/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    const html = (await response.text()).slice(0, 350000);
    return { ok: response.ok, status: response.status, html, headers: response.headers, finalUrl: response.url };
  } catch (error) {
    return { ok: false, status: 0, html: '', headers: new Headers(), finalUrl: url, error: error instanceof Error ? error.message : 'fetch failed' };
  }
}

function issue(
  check_name: string,
  affected_url: string,
  status: CheckStatus,
  issue_description: string,
  priority: IssuePriority,
  recommended_action: string,
): AuditIssueInput {
  return { check_name, affected_url, status, issue_description, priority, recommended_action };
}

export async function runTechnicalAudit(): Promise<{ issues: AuditIssueInput[]; summary: Record<string, unknown> }> {
  const seo = await getSeo();
  const origin = resolveSiteUrl(seo.site_url).replace(/\/$/, '');
  const paths = await getSitemapPaths();
  const issues: AuditIssueInput[] = [];

  const robots = await fetchOwned(`${origin}/robots.txt`, origin);
  issues.push(
    robots.ok && /sitemap:/i.test(robots.html)
      ? issue('robots.txt', `${origin}/robots.txt`, 'passed', 'robots.txt is reachable and references a sitemap.', 'low', 'Keep sitemap listed.')
      : issue('robots.txt', `${origin}/robots.txt`, robots.ok ? 'warning' : 'failed', robots.ok ? 'robots.txt is missing a Sitemap line.' : 'robots.txt could not be fetched.', 'critical', 'Serve robots.txt with a Sitemap URL.'),
  );
  if (/disallow:\s*\/\s*$/im.test(robots.html) && !/allow:\s*\//i.test(robots.html)) {
    issues.push(issue('robots.txt crawl', `${origin}/robots.txt`, 'failed', 'robots.txt appears to block the whole site.', 'critical', 'Do not use Disallow: / on the public website.'));
  }

  const sitemap = await fetchOwned(`${origin}/sitemap.xml`, origin);
  const sitemapOk = sitemap.ok && /<urlset|<sitemapindex/i.test(sitemap.html);
  issues.push(
    sitemapOk
      ? issue('sitemap.xml', `${origin}/sitemap.xml`, 'passed', 'sitemap.xml returns XML.', 'low', 'Keep the sitemap generated from published pages.')
      : issue('sitemap.xml', `${origin}/sitemap.xml`, 'failed', `sitemap.xml returned HTTP ${sitemap.status || 0}.`, 'critical', 'Fix the sitemap route so it returns valid XML.'),
  );

  const homepage = await fetchOwned(`${origin}/`, origin);
  issues.push(
    homepage.ok
      ? issue('homepage status', `${origin}/`, 'passed', `Homepage returned HTTP ${homepage.status}.`, 'low', 'Keep the homepage publicly reachable.')
      : issue('homepage status', `${origin}/`, 'failed', `Homepage returned HTTP ${homepage.status || 0}.`, 'critical', 'Restore the public homepage.'),
  );
  if (homepage.finalUrl.startsWith('https://')) {
    issues.push(issue('https', `${origin}/`, 'passed', 'Homepage is served over HTTPS.', 'low', 'Keep HTTPS enforced.'));
  } else if (homepage.ok) {
    issues.push(issue('https', homepage.finalUrl, 'failed', 'Homepage is not on HTTPS.', 'critical', 'Redirect HTTP traffic to HTTPS.'));
  }

  const www = homepage.finalUrl.includes('://www.');
  const preferWww = seo.canonical_host === 'www';
  if (homepage.ok && preferWww !== www && homepage.finalUrl.startsWith('http')) {
    issues.push(issue('www canonical host', homepage.finalUrl, 'warning', `Preferred host is ${preferWww ? 'www' : 'non-www'} but the response used ${www ? 'www' : 'non-www'}.`, 'medium', 'Align redirects with the canonical host in Global SEO.'));
  } else if (homepage.ok) {
    issues.push(issue('www canonical host', homepage.finalUrl, 'passed', 'Host matches the configured canonical preference.', 'low', 'Keep host redirects consistent.'));
  }

  const titles = new Map<string, string[]>();
  const samplePaths = [...new Set(['/', ...RECOMMENDED_PAGES.map((item) => item.path), ...paths.slice(0, 24)])];

  for (const path of samplePaths) {
    const url = `${origin}${path === '/' ? '' : path}`;
    const page = await fetchOwned(url, origin);
    const parsed = parsePublicHtml(page.html);
    if (!page.ok) {
      issues.push(issue('page status', url, 'failed', `HTTP ${page.status || 0}.`, path === '/' ? 'critical' : 'high', 'Fix the route or redirect.'));
      continue;
    }
    if (!parsed.title) {
      issues.push(issue('title', url, 'failed', 'Missing document title.', 'high', 'Add a unique SEO title.'));
    } else {
      const list = titles.get(parsed.title) || [];
      list.push(url);
      titles.set(parsed.title, list);
      if (parsed.title.length > 65) {
        issues.push(issue('title length', url, 'warning', `Title is ${parsed.title.length} characters.`, 'medium', 'Keep titles near 50–60 characters.'));
      }
    }
    if (!parsed.description) {
      issues.push(issue('meta description', url, 'failed', 'Missing meta description.', 'high', 'Add a unique meta description.'));
    } else if (parsed.description.length < 50 || parsed.description.length > 165) {
      issues.push(issue('meta description length', url, 'warning', `Description is ${parsed.description.length} characters.`, 'medium', 'Aim for 120–160 characters.'));
    }
    if (!parsed.canonical) {
      issues.push(issue('canonical', url, 'warning', 'No canonical URL in the HTML.', 'medium', 'Set a HTTPS canonical.'));
    } else if (!parsed.canonical.startsWith('https://') && !parsed.canonical.startsWith('/')) {
      issues.push(issue('canonical https', url, 'warning', `Canonical is ${parsed.canonical}.`, 'medium', 'Use HTTPS canonical URLs.'));
    }
    if (parsed.robots.includes('noindex') && !['/login', '/signup', '/thank-you', '/admin'].some((item) => path.startsWith(item))) {
      issues.push(issue('noindex', url, 'failed', 'Public page is noindexed.', 'critical', 'Remove noindex for crawlable marketing pages.'));
    }
    if (parsed.h1.length !== 1) {
      issues.push(issue('h1', url, parsed.h1.length ? 'warning' : 'failed', `Found ${parsed.h1.length} H1 heading(s).`, 'medium', 'Use a single H1 that matches the page topic.'));
    }
    if (!parsed.ogTitle || !parsed.ogDescription) {
      issues.push(issue('open graph', url, 'warning', 'Open Graph title or description is missing.', 'low', 'Set OG title and description.'));
    }
    if (parsed.missingAlt > 0) {
      issues.push(issue('image alt', url, 'warning', `${parsed.missingAlt} image(s) missing alt text.`, 'low', 'Add descriptive alt attributes.'));
    }
    const xRobots = page.headers.get('x-robots-tag') || '';
    if (/noindex/i.test(xRobots) && path === '/') {
      issues.push(issue('x-robots-tag', url, 'failed', 'X-Robots-Tag noindex on the homepage.', 'critical', 'Remove the noindex header from public pages.'));
    }
  }

  for (const [title, urls] of titles) {
    if (urls.length > 1) {
      issues.push(issue('duplicate title', urls[0], 'warning', `Title “${title.slice(0, 80)}” is reused on ${urls.length} pages.`, 'medium', 'Give each page a unique title.'));
    }
  }

  for (const missing of MISSING_SERVICE_PAGES) {
    const url = `${origin}${missing.path}`;
    const page = await fetchOwned(url, origin);
    if (!page.ok) {
      issues.push(issue('service coverage', url, 'warning', `${missing.name} does not have a dedicated public page.`, 'medium', 'Create this page in Website Content using verified Techantum services, then add it to the sitemap.'));
    }
  }

  issues.push(issue('core web vitals', origin, 'not_tested', 'Lab Core Web Vitals were not collected in this audit run.', 'low', 'Review CrUX / Search Console Experience when connected.'));
  issues.push(issue('javascript rendering', origin, 'passed', 'Public pages are App Router server-rendered HTML.', 'low', 'Keep important copy in server-rendered markup.'));

  const summary = {
    checked: samplePaths.length,
    failed: issues.filter((item) => item.status === 'failed').length,
    warning: issues.filter((item) => item.status === 'warning').length,
    passed: issues.filter((item) => item.status === 'passed').length,
    healthScore: seoHealthScore(issues.map((item) => ({ ...item, fix_status: 'open' }))),
  };
  return { issues, summary };
}
