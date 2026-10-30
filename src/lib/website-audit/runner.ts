import { q } from '@/lib/finance/db';
import { accessibilityFindings, summarizeAccessibility } from './accessibility';
import { securityHygieneFindings } from './webmaster/hygiene';
import { DEFAULT_AGENT_SETTINGS, runWebMaster } from './webmaster/agent';
import { getAgentSettings, listChunks } from './webmaster/knowledge';
import { DESKTOP, MOBILE, capturePreviewImage, scanWithPlaywright } from './browser';
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
    const hashes: Record<string, string> = {};
    const layoutAnomaly = new Map<string, boolean>();
    const screenshots: Record<string, boolean> = {};
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
      if (html && !desktopShot) {
        desktopShot = await capturePreviewImage(html, url, `${auditId}-og-${extracted.length}.jpg`).catch(() => null);
      }

      if (html) {
        const page = extractPage(html, url, status);
        extracted.push(page);
        hashes[page.normalizedUrl] = contentHash(html);
        screenshots[page.normalizedUrl] = Boolean(desktopShot || mobileShot);
        allFindings.push(...seoFindingsForPage(page));
        allFindings.push(...securityHygieneFindings(page));
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

    const agentRow = await getAgentSettings().catch(() => null);
    const agentSettings = {
      ...DEFAULT_AGENT_SETTINGS,
      agent_enabled: Boolean(audit.ai_enabled) && settings.ai_review_enabled && agentRow?.agent_enabled !== false,
      max_ai_pages: Number(agentRow?.max_ai_pages || settings.ai_max_pages),
      confidence_threshold: Number(agentRow?.confidence_threshold || settings.ai_confidence_threshold),
      content_character_limit: Number(agentRow?.content_character_limit || settings.max_content_chars),
      review_uiux: agentRow?.review_uiux !== false,
      review_content: agentRow?.review_content !== false,
      review_images: agentRow?.review_images !== false,
      review_seo_interpretation: agentRow?.review_seo_interpretation !== false,
    };
    const chunks = await listChunks().catch(() => undefined);
    const flags: Record<string, boolean> = {};
    for (const [key, value] of layoutAnomaly) flags[key] = value;
    const mastered = await runWebMaster({
      pages: extracted,
      findings: allFindings,
      settings: agentSettings,
      hashes,
      screenshots,
      layoutFlags: flags,
      chunks,
      skipAi: !agentSettings.agent_enabled,
      cacheGet: async (key) => {
        const { rows } = await q<AuditRow>(undefined, `SELECT response_json FROM website_audit_ai_cache WHERE cache_key=$1`, [key]);
        return rows[0]?.response_json || null;
      },
      cacheSet: async (key, value) => {
        await q(
          undefined,
          `INSERT INTO website_audit_ai_cache (cache_key, normalized_url, content_hash, engine_version, review_version, response_json)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT (cache_key) DO UPDATE SET response_json=EXCLUDED.response_json`,
          [key, startUrl, hashes[startUrl] || '', '1.0.0', '1.0.0', JSON.stringify(value)]
        );
      },
    }).catch(async (error) => {
      progress.ai_review = false;
      return {
        findings: dedupeFindings(allFindings).map((item) => ({
          ...item,
          finding_type: 'verified_issue' as const,
          standard_reference: { name: 'Deterministic scanner', rule: item.rule_code },
          requires_manual_review: false,
          suggested_ticket_type: 'BUG',
          evidence_type: 'deterministic',
        })),
        summary: { error: error instanceof Error ? error.message : 'Web Master skipped' },
        versions: { agent_version: '1.0.0', prompt_version: '1.0.0', standards_version: '1.0.0', techantum_standard_version: '1.0', engine_version: '1.0.0', model_version: null },
        ai_review_status: 'failed' as const,
        selected_urls: [],
      };
    });
    progress.ai_review = mastered.ai_review_status === 'completed' || mastered.ai_review_status === 'partial';

    const deduped = mastered.findings.length ? mastered.findings : dedupeFindings(allFindings);
    for (const finding of deduped) {
      const pageId = finding.page_url ? pageIds.get(finding.page_url) || null : null;
      const wm = finding as typeof finding & { finding_type?: string; standard_reference?: unknown; requires_manual_review?: boolean; suggested_ticket_type?: string; affected_urls?: string[] };
      await q(
        undefined,
        `INSERT INTO website_audit_findings (
          audit_id, page_id, rule_code, category, severity, title, description, recommendation, source,
          selector, viewport, evidence, fingerprint, affected_urls, ai_confidence,
          finding_type, standard_reference, requires_manual_review, suggested_ticket_type, original_ai_output
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb,$15,$16,$17::jsonb,$18,$19,$20::jsonb)`,
        [
          auditId, pageId, finding.rule_code, finding.category, finding.severity, finding.title, finding.description,
          finding.recommendation, finding.source, finding.selector || null, finding.viewport || null,
          JSON.stringify({ ...(finding.evidence || {}), url: finding.page_url }), fingerprintOf(finding),
          JSON.stringify(wm.affected_urls || (finding.page_url ? [finding.page_url] : [])),
          finding.ai_confidence ?? null,
          wm.finding_type || (finding.source === 'AI' ? 'ai_recommendation' : 'verified_issue'),
          JSON.stringify(wm.standard_reference || {}),
          Boolean(wm.requires_manual_review),
          wm.suggested_ticket_type || null,
          finding.source === 'AI' ? JSON.stringify({ title: finding.title, description: finding.description, recommendation: finding.recommendation, severity: finding.severity }) : null,
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
        pages_scanned=$6, completed_at=NOW(), progress=$7::jsonb, error_message=$8, webmaster_versions=$9::jsonb,
        webmaster_summary=$10::jsonb, ai_review_status=$11 WHERE id=$1`,
      [
        auditId, status, overall, JSON.stringify(scores), JSON.stringify([...new Set(failed)]), extracted.length, JSON.stringify(progress),
        extracted.length ? null : 'No pages could be scanned', JSON.stringify(mastered.versions),
        JSON.stringify({ ...mastered.summary, category_summary: scores, overall }),
        mastered.ai_review_status,
      ]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit failed';
    await q(undefined, `UPDATE website_audits SET status='failed', error_message=$2, completed_at=NOW() WHERE id=$1`, [auditId, message]);
  }
}
