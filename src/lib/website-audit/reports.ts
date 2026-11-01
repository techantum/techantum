import { toCsv } from '@/lib/marketing-seo/csv';
import { FINDING_COLUMNS, findingExportRows } from './export-files';
import type { FindingDraft } from './types';

export function managementReport(audit: Record<string, unknown>, findings: Record<string, unknown>[]) {
  const critical = findings.filter((item) => item.severity === 'critical' || item.severity === 'high');
  return {
    mode: 'management',
    audit_name: audit.audit_name,
    website: audit.website_url,
    project: audit.project_name,
    environment: audit.environment,
    date: audit.created_at,
    pages_scanned: audit.pages_scanned,
    overall_score: audit.overall_score,
    category_scores: audit.category_scores,
    top_issues: critical.slice(0, 8),
    counts: {
      critical: findings.filter((item) => item.severity === 'critical').length,
      high: findings.filter((item) => item.severity === 'high').length,
      medium: findings.filter((item) => item.severity === 'medium').length,
      low: findings.filter((item) => item.severity === 'low').length,
      suggestion: findings.filter((item) => item.severity === 'suggestion').length,
    },
    summary: (audit.webmaster_summary as { overall_quality_assessment?: string } | undefined)?.overall_quality_assessment
      || `Scanned ${audit.pages_scanned || 0} page(s). Score ${audit.overall_score ?? '—'}. ${critical.length} critical/high finding(s).`,
    webmaster: audit.webmaster_summary || null,
    versions: audit.webmaster_versions || null,
    finding_types: {
      verified_issue: findings.filter((item) => item.finding_type === 'verified_issue').length,
      best_practice: findings.filter((item) => item.finding_type === 'best_practice').length,
      ai_recommendation: findings.filter((item) => item.finding_type === 'ai_recommendation').length,
      manual_review: findings.filter((item) => item.finding_type === 'manual_review').length,
    },
  };
}

export function developerReport(audit: Record<string, unknown>, findings: Record<string, unknown>[], pages: Record<string, unknown>[]) {
  return {
    mode: 'developer',
    audit,
    pages: pages.map((page) => ({
      url: page.normalized_url,
      title: page.page_title,
      status: page.http_status,
      screenshot_desktop: page.desktop_screenshot,
      screenshot_mobile: page.mobile_screenshot,
    })),
    findings: findings.map((item) => ({
      severity: item.severity,
      category: item.category,
      title: item.title,
      url: item.affected_urls,
      viewport: item.viewport,
      selector: item.selector,
      evidence: item.evidence,
      description: item.description,
      recommendation: item.recommendation,
      source: item.source,
      status: item.status,
      finding_type: item.finding_type,
      standard: item.standard_reference,
      confidence: item.ai_confidence,
    })),
  };
}

export function findingsCsv(findings: Record<string, unknown>[]) {
  const keys = FINDING_COLUMNS.map((column) => column.key);
  return toCsv(keys, findingExportRows(findings));
}

export function printableHtml(audit: Record<string, unknown>, findings: Record<string, unknown>[]) {
  const blocks = findingExportRows(findings).map((item, index) => `
    <article>
      <h2>${index + 1}. ${escapeHtml(item.title)}</h2>
      <p class="meta">${escapeHtml([item.severity, item.category, item.page].filter(Boolean).join(' · '))}</p>
      ${item.description ? `<p><strong>Problem.</strong> ${escapeHtml(item.description)}</p>` : ''}
      ${item.recommendation ? `<p><strong>Fix.</strong> ${escapeHtml(item.recommendation)}</p>` : ''}
    </article>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(String(audit.audit_name || 'Website audit'))}</title>
  <style>body{font-family:sans-serif;max-width:720px;margin:40px auto;color:#111;line-height:1.5}article{padding:18px 0;border-top:1px solid #e5e7eb}h1{margin-bottom:8px}h2{font-size:16px;margin:0 0 4px}.meta{color:#64748b;font-size:13px}</style></head>
  <body><h1>Website Audit Report</h1>
  <p>${escapeHtml(String(audit.website_url || ''))}</p>
  <p>Score ${audit.overall_score ?? '—'} · ${audit.pages_scanned || 0} pages scanned · ${findings.length} findings</p>
  ${blocks || '<p>No findings.</p>'}
  </body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}

export function findingToDraft(row: Record<string, unknown>): FindingDraft {
  return {
    rule_code: String(row.rule_code),
    category: row.category as FindingDraft['category'],
    severity: row.severity as FindingDraft['severity'],
    title: String(row.title),
    description: String(row.description || ''),
    recommendation: String(row.recommendation || ''),
    source: row.source as FindingDraft['source'],
  };
}
