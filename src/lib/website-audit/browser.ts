import { saveUploadedFile } from '@/lib/storage/local';
import type { LayoutSignals, PerformanceSummary, TypographyProfile } from './types';
import { aggregateTypography, emptyTypography } from './typography';
import { lighthouseFromTimings } from './performance';
import { assertPublicHttpUrl } from './url';

export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

export type BrowserPageResult = {
  html: string;
  finalUrl: string;
  status: number | null;
  title: string;
  screenshotUrl: string | null;
  consoleErrors: string[];
  failedRequests: { url: string; status: number }[];
  typography: TypographyProfile;
  layout: LayoutSignals;
  performance: PerformanceSummary;
};

const LAYOUT_SCRIPT = `(() => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const overflowX = doc.scrollWidth > vw + 4;
  const bodyWiderThanViewport = (document.body?.scrollWidth || 0) > vw + 4;
  const nodes = [...document.querySelectorAll('h1,h2,h3,p,button,a,li')].slice(0, 120);
  const samples = nodes.map((el, i) => {
    const s = getComputedStyle(el);
    return { selector: el.tagName.toLowerCase() + ':nth(' + i + ')', family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, tag: el.tagName.toLowerCase() };
  });
  const buttons = [...document.querySelectorAll('button, a.btn, [class*="btn"]')].slice(0, 20).map((el) => el.getBoundingClientRect().height);
  const variance = buttons.length > 1 ? Math.max(...buttons) - Math.min(...buttons) : 0;
  let clippedCount = 0;
  let overlappingCount = 0;
  const boxes = nodes.slice(0, 40).map((el) => el.getBoundingClientRect());
  for (const box of boxes) {
    if (box.width > 20 && box.right > vw + 8) clippedCount += 1;
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const overlap = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      if (overlap && a.width > 40 && b.width > 40) overlappingCount += 1;
    }
  }
  const nav = performance.getEntriesByType('navigation')[0];
  const paints = performance.getEntriesByType('paint');
  const resources = performance.getEntriesByType('resource').slice(0, 80).map((r) => ({ url: r.name, bytes: r.transferSize || 0, type: r.initiatorType }));
  return {
    samples, overflowX, bodyWiderThanViewport, clippedCount, overlappingCount, buttonHeightVariance: variance,
    fcp: paints.find((p) => p.name === 'first-contentful-paint')?.startTime || null,
    lcp: nav ? nav.loadEventEnd : null,
    resources,
  };
})()`;

export async function capturePreviewImage(html: string, pageUrl: string, fileName: string): Promise<string | null> {
  const match = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    || html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  const src = match?.[1];
  if (!src) return null;
  try {
    const absolute = new URL(src, pageUrl).toString();
    await assertPublicHttpUrl(absolute);
    const response = await fetch(absolute, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const buffer = Buffer.from((await response.arrayBuffer()).slice(0, 2_000_000));
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const saved = await saveUploadedFile('website-audits', fileName.replace(/\.(jpg|jpeg|png|webp)$/i, `.${ext}`), new Blob([new Uint8Array(buffer)]));
    return saved.url;
  } catch {
    return null;
  }
}

export async function scanWithPlaywright(url: string, viewport: { width: number; height: number }, timeoutMs: number, screenshotName: string): Promise<BrowserPageResult | null> {
  let playwright: any;
  try {
    playwright = await import('playwright');
  } catch {
    return null;
  }
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport, ignoreHTTPSErrors: false });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: { url: string; status: number }[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on('pageerror', (error) => consoleErrors.push(String(error.message || error).slice(0, 300)));
    page.on('response', (response) => {
      if (response.status() >= 400) failedRequests.push({ url: response.url().slice(0, 300), status: response.status() });
    });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(400);
    const html = await page.content();
    let screenshotUrl: string | null = null;
    try {
      const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 55 });
      const saved = await saveUploadedFile('website-audits', screenshotName, new Blob([buffer]));
      screenshotUrl = saved.url;
    } catch {
      screenshotUrl = null;
    }
    const evaluated = await page.evaluate(LAYOUT_SCRIPT).catch(() => null) as {
      samples?: { selector: string; family: string; size: string; weight: string; tag: string }[];
      overflowX?: boolean;
      bodyWiderThanViewport?: boolean;
      clippedCount?: number;
      overlappingCount?: number;
      buttonHeightVariance?: number;
      fcp?: number | null;
      lcp?: number | null;
      resources?: { url: string; bytes: number; type: string }[];
    } | null;
    const typography = evaluated?.samples ? aggregateTypography(evaluated.samples) : emptyTypography();
    const layout: LayoutSignals = {
      overflowX: Boolean(evaluated?.overflowX),
      bodyWiderThanViewport: Boolean(evaluated?.bodyWiderThanViewport),
      clippedCount: evaluated?.clippedCount || 0,
      overlappingCount: evaluated?.overlappingCount || 0,
      buttonHeightVariance: evaluated?.buttonHeightVariance || 0,
    };
    const performance = lighthouseFromTimings({ lcp: evaluated?.lcp, fcp: evaluated?.fcp });
    performance.largeResources = (evaluated?.resources || []).filter((item) => item.bytes > 350_000).slice(0, 8);
    const finalUrl = page.url();
    const title = await page.title().catch(() => '');
    await context.close();
    return {
      html,
      finalUrl,
      status: response?.status() ?? null,
      title,
      screenshotUrl,
      consoleErrors: consoleErrors.slice(0, 20),
      failedRequests: failedRequests.slice(0, 20),
      typography,
      layout,
      performance,
    };
  } finally {
    await browser.close();
  }
}
