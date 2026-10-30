import type { WebMasterFinding } from './validator';

const SITEWIDE = /button|font|typograph|spacing|cta|heading style|open graph|alt text|landmark/i;

export function consolidateFindings(findings: WebMasterFinding[]): WebMasterFinding[] {
  const groups = new Map<string, WebMasterFinding[]>();
  for (const finding of findings) {
    const merge = finding.source === 'AI' || SITEWIDE.test(`${finding.rule_code} ${finding.title}`);
    const key = merge
      ? `${finding.rule_code}|${finding.finding_type}|${finding.viewport || ''}`
      : `${finding.rule_code}|${finding.page_url}|${finding.selector || ''}|${finding.viewport || ''}`;
    const list = groups.get(key) || [];
    list.push(finding);
    groups.set(key, list);
  }
  const out: WebMasterFinding[] = [];
  for (const list of groups.values()) {
    const first = { ...list[0] };
    const urls = [...new Set(list.map((item) => item.page_url).filter(Boolean) as string[])];
    if (urls.length > 1) {
      first.description = `${first.title} found across ${urls.length} pages. ${first.description}`;
      first.evidence = { ...(first.evidence || {}), urls };
      (first as WebMasterFinding & { affected_urls?: string[] }).affected_urls = urls;
    }
    out.push(first);
  }
  return out;
}

export function managementSummary(findings: WebMasterFinding[], scores: Record<string, number>, overall: number | null) {
  const high = findings.filter((item) => item.severity === 'critical' || item.severity === 'high');
  const strengths = Object.entries(scores).filter(([, value]) => value >= 90).map(([key]) => key);
  return {
    overall_quality_assessment: overall == null ? 'Scan complete. Score pending evidence.' : `Overall score ${overall}/100 from deterministic penalties with Web Master interpretation.`,
    top_critical_high: high.slice(0, 8).map((item) => ({ title: item.title, severity: item.severity, type: item.finding_type, page: item.page_url })),
    key_strengths: strengths.length ? strengths : ['No category scored 90+'],
    top_improvement_priorities: findings
      .filter((item) => item.finding_type !== 'ai_recommendation' || (item.ai_confidence || 0) >= 0.75)
      .slice(0, 6)
      .map((item) => item.title),
    category_summary: scores,
    finding_types: {
      verified_issue: findings.filter((item) => item.finding_type === 'verified_issue').length,
      best_practice: findings.filter((item) => item.finding_type === 'best_practice').length,
      ai_recommendation: findings.filter((item) => item.finding_type === 'ai_recommendation').length,
      manual_review: findings.filter((item) => item.finding_type === 'manual_review').length,
    },
  };
}

export function preferDeterministic(ai: WebMasterFinding[], deterministic: WebMasterFinding[]): WebMasterFinding[] {
  const codes = new Set(deterministic.map((item) => `${item.rule_code}|${item.page_url}`));
  const kept = ai.filter((item) => {
    const overlap = deterministic.some((det) => det.page_url === item.page_url && similar(det.title, item.title));
    if (!overlap) return true;
    return item.finding_type === 'ai_recommendation' && !codes.has(`${item.rule_code}|${item.page_url}`);
  });
  return [...deterministic, ...kept];
}

function similar(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.includes(y.slice(0, 18)) || y.includes(x.slice(0, 18));
}
