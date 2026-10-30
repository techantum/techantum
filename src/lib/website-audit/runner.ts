import { q } from '@/lib/finance/db';
import { accessibilityFindings, summarizeAccessibility } from './accessibility';
import { reviewPagesWithAi, selectAiPages } from './ai';
import { DESKTOP, MOBILE, scanWithPlaywright } from './browser';
import { discoverPages, defaultFetch } from './crawl';
import { clampPages } from './defaults';
import { contentHash, dedupeFindings, fingerprintOf } from './findings';
import { formFindings } from './forms';
import { extractPage } from './html';
import { brokenImages, brokenInternalLinks, browserFindings, layoutFindings } from './layout';
import { performanceFindings } from './performance';
import { seoFindingsForPage, siteSeoFindings } from './seo';
import { getSettings } from './service';
import { categoryScores, overallScore } from './scoring';
import { typographyFindings } from './typography';
import type { ExtractedPage, FindingDraft } from './types';
import { assertPublicHttpUrl, normalizeUrl, sameDomain } from './url';

type AuditRow = Record<string, unknown>;

async function setProgress(id: string, progress: Record<string, unknown>, extra: string[] = []) {
  await q(undefined, `UPDATE website_audits SET progress=$2::jsonb, updated_at=NOW() ${extra.join(' ')} WHERE id=$1`, [id, JSON.stringify(progress)]);
}

export async function runAuditJob(auditId: string) {
  const { rows } = await q<AuditRow>(undefined, `SELECT * FROM website_audits WHERE id=$1`, [auditId]);
  const audit = rows[0];
  if (!audit) return;
  const settings = await getSettings();
  const maxPages = clampPages(Number(audit.max_pages), settings);
  const progress = { stage: 'starting', pages_discovered: 0, pages_scanned: 0, checks_completed: false, ai_review: false, report: false };
  await q(undefined, `UPDATE website_audits SET status='running', started_at=NOW(), error_message=NULL, progress=$2::jsonb WHERE id=$1`, [auditId, JSON.stringify(progress)]);
  const failed: string[] = [];
  try {
    const startUrl = await assertPublicHttpUrl(String(audit.website_url));
    progress.stage = 'crawl';
    await setProgress(auditId, progress);
    const discovered = await discoverPages({
      startUrl,
      maxPages,
      maxDepth: settings.max_depth,
      selectedUrls: Array.isArray(audit.selected_urls) ? (audit.selected_urls as string[]) : [],
      scope: String(audit.audit_scope) as 'single' | 'website' | 'selected',
      delayMs: settings.crawl_delay_ms,
    });
    failed.push(...discovered.failed);
    progress.pages_discovered = discovered.urls.length;
    await q(undefined, `UPDATE website_audits SET pages_discovered=$2, progress=$3::jsonb WHERE id=$1`, [auditId, discovered.urls.length, JSON.stringify(progress)]);

    const extracted: ExtractedPage[] = [];
    const htmlByUrl = new Map<string, string>();
    const hashes: Record<string, string> = {};
    const layoutAnomaly = new Map<string, boolean>();
    const allFindings: FindingDraft[] = [];
    const pageIds = new Map<string, string>();

    for (const url of discovered.urls) {
      progress.stage = 'scan';
      let html = '';
      let status: number | null = null;
      let desktopShot: string | null = null;
      let mobileShot: string | null = null;
      let consoleErrors: string[] = [];
      let failedRequests: { url: string; status: number }[] = [];
      let scanStatus = 'completed';
      let errorMessage: string | null = null;
      try {
        const fetched = await defaultFetch(url, undefined, settings.page_timeout_ms);
        html = fetched.body.slice(0, 1_500_000);
        status = fetched.status;
      } catch (error) {
        try {
          const retry = await defaultFetch(url, undefined, settings.page_timeout_ms);
          html = retry.body.slice(0, 1_500_000);
          status = retry.status;
        } catch (retryError) {
          scanStatus = 'failed';
          errorMessage = retryError instanceof Error ? retryError.message : 'Scan failed';
          failed.push(url);
        }
      }

      if (html && audit.desktop_enabled) {
        const browser = await scanWithPlaywright(url, DESKTOP, settings.page_timeout_ms, `${auditId}-d-${pageIds.size}.jpg`).catch(() => null);
        if (browser) {
          html = browser.html || html;
          status = browser.status ?? status;
          desktopShot = browser.screenshotUrl;
          consoleErrors = browser.consoleErrors;
          failedRequests = browser.failedRequests;
          allFindings.push(...typographyFindings(browser.typography, url));
          allFindings.push(...layoutFindings(browser.layout, url, 'desktop'));
          if (settings.lighthouse_enabled) allFindings.push(...performanceFindings(browser.performance, url));
          if (browser.layout.overflowX || browser.layout.bodyWiderThanViewport) layoutAnomaly.set(url, true);
        }
      }
      if (html && audit.mobile_enabled) {
        const browser = await scanWithPlaywright(url, MOBILE, settings.page_timeout_ms, `${auditId}-m-${pageIds.size}.jpg`).catch(() => null);
        if (browser) {
          mobileShot = browser.screenshotUrl;
          allFindings.push(...layoutFindings(browser.layout, url, 'mobile'));
          allFindings.push(...typographyFindings(browser.typography, url));
          if (browser.layout.overflowX) layoutAnomaly.set(url, true);
        }
      }

      if (html) {
        const page = extractPage(html, url, status);
        extracted.push(page);
        htmlByUrl.set(page.normalizedUrl, html);
        hashes[page.normalizedUrl] = contentHash(html);
        allFindings.push(...seoFindingsForPage(page));
        if (settings.accessibility_enabled) allFindings.push(...accessibilityFindings(page, html));
        if (audit.forms_enabled) allFindings.push(...formFindings(page.forms, page.normalizedUrl, 'safe'));
        allFindings.push(...browserFindings(page.normalizedUrl, consoleErrors, failedRequests));
        const brokenImgs = page.images.filter((img) => !img.src).map((img) => img.src);
        allFindings.push(...brokenImages(page.normalizedUrl, brokenImgs));
        const broken: { href: string; status: number }[] = [];
        const internals = page.links.filter((link) => link.internal).slice(0, 12);
        for (const link of internals) {
          if (!sameDomain(link.href, startUrl)) continue;
          try {
            const res = await defaultFetch(link.href, { method: 'GET' }, Math.min(8000, settings.page_timeout_ms));
            if (res.status >= 400) broken.push({ href: link.href, status: res.status });
          } catch {
            broken.push({ href: link.href, status: 0 });
          }
        }
        allFindings.push(...brokenInternalLinks(page.normalizedUrl, broken));

        const { rows: pageRows } = await q<AuditRow>(
          undefined,
          `INSERT INTO website_audit_pages (
            audit_id, url, normalized_url, page_title, http_status, content_hash, page_type, scan_status,
            desktop_screenshot, mobile_screenshot, lighthouse_summary, accessibility_summary,
            console_error_count, failed_request_count, content_sample, error_message
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
          [
            auditId, page.url, page.normalizedUrl, page.title, page.httpStatus, hashes[page.normalizedUrl], page.pageType,
            scanStatus, desktopShot, mobileShot, JSON.stringify({}), JSON.stringify(summarizeAccessibility(allFindings.filter((item) => item.page_url === page.normalizedUrl))),
            consoleErrors.length, failedRequests.length, page.contentSample.slice(0, settings.max_content_chars), errorMessage,
          ]
        );
        pageIds.set(page.normalizedUrl, String(pageRows[0].id));
      } else {
        await q(
          undefined,
          `INSERT INTO website_audit_pages (audit_id, url, normalized_url, scan_status, error_message) VALUES ($1,$2,$3,'failed',$4)`,
          [auditId, url, normalizeUrl(url), errorMessage]
        );
      }
      progress.pages_scanned = extracted.length;
      await q(undefined, `UPDATE website_audits SET pages_scanned=$2, progress=$3::jsonb WHERE id=$1`, [auditId, extracted.length, JSON.stringify(progress)]);
    }

    allFindings.push(...siteSeoFindings(extracted, { robots: discovered.robots, sitemap: discovered.sitemap }));
    progress.checks_completed = true;
    progress.stage = 'ai';
    await setProgress(auditId, progress);

    if (audit.ai_enabled && settings.ai_review_enabled) {
      const candidates = extracted.map((page) => ({
        url: page.normalizedUrl,
        pageType: page.pageType,
        layoutAnomaly: Boolean(layoutAnomaly.get(page.url) || layoutAnomaly.get(page.normalizedUrl)),
      }));
      const selected = selectAiPages(candidates, settings.ai_max_pages);
      const cache = {
        async get(key: string) {
          const { rows } = await q<AuditRow>(undefined, `SELECT response_json FROM website_audit_ai_cache WHERE cache_key=$1`, [key]);
          return rows[0]?.response_json || null;
        },
        async set(key: string, value: unknown) {
          const page = selected.find(() => true);
          await q(
            undefined,
            `INSERT INTO website_audit_ai_cache (cache_key, normalized_url, content_hash, engine_version, review_version, response_json)
             VALUES ($1,$2,$3,'${'1.0.0'}','${'1.0.0'}',$4::jsonb) ON CONFLICT (cache_key) DO UPDATE SET response_json=EXCLUDED.response_json`,
            [key, page?.url || startUrl, hashes[page?.url || ''] || '', JSON.stringify(value)]
          );
        },
      };
      const aiFindings = await reviewPagesWithAi({
        pages: selected.map((page) => {
          const extractedPage = extracted.find((item) => item.normalizedUrl === page.url);
          return {
            url: page.url,
            pageType: page.pageType,
            viewport: 'desktop',
            contentSample: extractedPage?.contentSample || '',
            typography: {},
            deterministic: allFindings
              .filter((item) => item.page_url === page.url)
              .slice(0, 12)
              .map((item) => ({ title: item.title, rule_code: item.rule_code, severity: item.severity })),
          };
        }),
        contentHashes: hashes,
        cache,
        threshold: settings.ai_confidence_threshold,
      });
      allFindings.push(...aiFindings);
      progress.ai_review = true;
    } else {
      progress.ai_review = false;
    }

    const deduped = dedupeFindings(allFindings);
    for (const finding of deduped) {
      const pageId = finding.page_url ? pageIds.get(finding.page_url) || null : null;
      await q(
        undefined,
        `INSERT INTO website_audit_findings (
          audit_id, page_id, rule_code, category, severity, title, description, recommendation, source,
          selector, viewport, evidence, fingerprint, affected_urls, ai_confidence
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb,$15)`,
        [
          auditId, pageId, finding.rule_code, finding.category, finding.severity, finding.title, finding.description,
          finding.recommendation, finding.source, finding.selector || null, finding.viewport || null,
          JSON.stringify({ ...(finding.evidence || {}), url: finding.page_url }), fingerprintOf(finding),
          JSON.stringify((finding as FindingDraft & { affected_urls?: string[] }).affected_urls || (finding.page_url ? [finding.page_url] : [])),
          finding.ai_confidence ?? null,
        ]
      );
    }

    const scores = categoryScores(deduped, settings.severity_penalties);
    const overall = overallScore(scores, settings.score_weights);
    const status = failed.length && extracted.length ? 'partially_completed' : extracted.length ? 'completed' : 'failed';
    progress.report = true;
    progress.stage = 'done';
    await q(
      undefined,
      `UPDATE website_audits SET status=$2, overall_score=$3, category_scores=$4::jsonb, failed_urls=$5::jsonb,
        pages_scanned=$6, completed_at=NOW(), progress=$7::jsonb, error_message=$8 WHERE id=$1`,
      [auditId, status, overall, JSON.stringify(scores), JSON.stringify([...new Set(failed)]), extracted.length, JSON.stringify(progress), extracted.length ? null : 'No pages could be scanned']
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit failed';
    await q(undefined, `UPDATE website_audits SET status='failed', error_message=$2, completed_at=NOW() WHERE id=$1`, [auditId, message]);
  }
}
