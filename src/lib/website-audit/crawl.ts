import { extractLinks, parseSitemapUrls } from './html';
import { assertPublicHttpUrl, looksLikeInfiniteList, normalizeUrl, originOf, sameDomain, shouldSkipHref } from './url';

export type FetchResult = { url: string; status: number; body: string; finalUrl: string };
export type FetchFn = (url: string, init?: { method?: string; redirect?: 'manual' | 'follow' }) => Promise<FetchResult>;

const DEFAULT_HEADERS = {
  'User-Agent': 'TechantumWebsiteAudit/1.0 (+https://techantum.com)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

export async function defaultFetch(url: string, init?: { method?: string; redirect?: 'manual' | 'follow' }, timeoutMs = 15000): Promise<FetchResult> {
  await assertPublicHttpUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: init?.method || 'GET',
      redirect: init?.redirect || 'manual',
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      const next = new URL(location, url).toString();
      await assertPublicHttpUrl(next);
      return defaultFetch(next, { method: init?.method || 'GET' }, timeoutMs);
    }
    const body = init?.method === 'HEAD' ? '' : await response.text();
    return { url, status: response.status, body, finalUrl: response.url || url };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverPages(input: {
  startUrl: string;
  maxPages: number;
  maxDepth: number;
  selectedUrls?: string[];
  scope: 'single' | 'website' | 'selected';
  fetchFn?: FetchFn;
  delayMs?: number;
}): Promise<{ urls: string[]; robots: boolean; sitemap: boolean; failed: string[] }> {
  const start = normalizeUrl(input.startUrl);
  const origin = originOf(start);
  const fetchFn = input.fetchFn || ((url: string) => defaultFetch(url));
  const failed: string[] = [];
  const robotsUrl = `${origin}/robots.txt`;
  const sitemapUrl = `${origin}/sitemap.xml`;
  let robots = false;
  let sitemap = false;
  const queue: { url: string; depth: number }[] = [];
  const seen = new Set<string>();

  if (input.scope === 'single') {
    return { urls: [start], robots: false, sitemap: false, failed };
  }
  if (input.scope === 'selected') {
    const urls = (input.selectedUrls || []).map((item) => normalizeUrl(item)).filter((item) => sameDomain(item, origin));
    return { urls: [start, ...urls.filter((item) => item !== start)].slice(0, input.maxPages), robots: false, sitemap: false, failed };
  }

  try {
    const robotsRes = await fetchFn(robotsUrl);
    robots = robotsRes.status >= 200 && robotsRes.status < 400;
    const sitemapLine = robotsRes.body.split(/\r?\n/).find((line) => /^sitemap:/i.test(line));
    if (sitemapLine) {
      const loc = sitemapLine.replace(/^sitemap:\s*/i, '').trim();
      try {
        const map = await fetchFn(loc);
        if (map.status < 400) {
          sitemap = true;
          for (const url of parseSitemapUrls(map.body, origin).slice(0, input.maxPages)) {
            queue.push({ url, depth: 1 });
          }
        }
      } catch {
        failed.push(loc);
      }
    }
  } catch {
    robots = false;
  }

  try {
    const map = await fetchFn(sitemapUrl);
    if (map.status < 400 && (map.body.includes('<urlset') || map.body.includes('<sitemapindex'))) {
      sitemap = true;
      for (const url of parseSitemapUrls(map.body, origin).slice(0, input.maxPages)) {
        queue.push({ url, depth: 1 });
      }
    }
  } catch {
    /* optional */
  }

  queue.unshift({ url: start, depth: 0 });
  const urls: string[] = [];

  while (queue.length && urls.length < input.maxPages) {
    const item = queue.shift()!;
    if (seen.has(item.url) || looksLikeInfiniteList(item.url) || shouldSkipHref(item.url)) continue;
    if (!sameDomain(item.url, origin)) continue;
    seen.add(item.url);
    try {
      const page = await fetchFn(item.url);
      if (page.status >= 400) failed.push(item.url);
      urls.push(normalizeUrl(page.finalUrl || item.url));
      if (item.depth < input.maxDepth) {
        for (const link of extractLinks(page.body, page.finalUrl || item.url)) {
          if (!seen.has(link) && sameDomain(link, origin)) queue.push({ url: link, depth: item.depth + 1 });
        }
      }
      if (input.delayMs) await new Promise((resolve) => setTimeout(resolve, input.delayMs));
    } catch {
      failed.push(item.url);
    }
  }

  return { urls: [...new Set(urls)].slice(0, input.maxPages), robots, sitemap, failed };
}
