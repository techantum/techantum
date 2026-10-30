import { toCsv } from '@/lib/marketing-seo/csv';
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
    summary: `Scanned ${audit.pages_scanned || 0} page(s). Score ${audit.overall_score ?? '—'}. ${critical.length} critical/high finding(s).`,
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
    })),
  };
}

export function findingsCsv(findings: Record<string, unknown>[]) {
  return toCsv(
    ['severity', 'category', 'title', 'description', 'recommendation', 'source', 'status', 'selector', 'viewport'],
    findings.map((item) => ({
      severity: item.severity,
      category: item.category,
      title: item.title,
      description: item.description,
      recommendation: item.recommendation,
      source: item.source,
      status: item.status,
      selector: item.selector,
      viewport: item.viewport,
    }))
  );
}

export function printableHtml(audit: Record<string, unknown>, findings: Record<string, unknown>[]) {
  const rows = findings
    .map((item) => `<tr><td>${item.severity}</td><td>${item.category}</td><td>${escapeHtml(String(item.title))}</td><td>${escapeHtml(String(item.recommendation || ''))}</td></tr>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(String(audit.audit_name))}</title>
  <style>body{font-family:sans-serif;padding:24px;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}h1{margin-bottom:8px}</style></head>
  <body><h1>${escapeHtml(String(audit.audit_name))}</h1>
  <p>${escapeHtml(String(audit.website_url))} · Score ${audit.overall_score ?? '—'} · ${audit.pages_scanned || 0} pages</p>
  <table><thead><tr><th>Severity</th><th>Category</th><th>Title</th><th>Recommendation</th></tr></thead><tbody>${rows}</tbody></table>
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
