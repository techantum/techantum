import { extractJsonText } from '@/lib/ai/json';
import { CATEGORIES, FINDING_TYPES, SEVERITIES, type FindingType } from './constants';
import type { FindingDraft } from '../types';

export type WebMasterFinding = FindingDraft & {
  finding_type: FindingType;
  standard_reference: { name: string; version?: string; rule?: string; url?: string } | null;
  requires_manual_review: boolean;
  suggested_ticket_type: string;
  evidence_type: string;
};

const ALLOWED_CAT = new Set(CATEGORIES);
const ALLOWED_TYPE = new Set(FINDING_TYPES);
const ALLOWED_SEV = new Set(SEVERITIES);

export function parseAgentJson(raw: string): { findings: unknown[]; summary?: unknown } | null {
  try {
    const parsed = JSON.parse(extractJsonText(raw) || raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray((parsed as { findings?: unknown }).findings)) return null;
    return parsed as { findings: unknown[]; summary?: unknown };
  } catch {
    return null;
  }
}

export function validateAgentFindings(
  raw: string | { findings: unknown[] },
  pageUrl: string,
  threshold: number
): WebMasterFinding[] {
  const parsed = typeof raw === 'string' ? parseAgentJson(raw) : raw;
  if (!parsed) return [];
  const out: WebMasterFinding[] = [];
  for (const item of parsed.findings.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const category = String(row.category || '').toLowerCase();
    if (!ALLOWED_CAT.has(category as (typeof CATEGORIES)[number])) continue;
    const title = String(row.title || '').trim();
    const description = String(row.description || '').trim();
    const recommendation = String(row.recommendation || '').trim();
    if (!title || !description || !recommendation) continue;
    if (/ugly|bad design|seo is poor|ui needs improvement/i.test(`${title} ${description}`)) continue;
    let confidence = Number(row.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.5;
    confidence = Math.max(0, Math.min(1, confidence));
    let findingType = String(row.finding_type || 'ai_recommendation').toLowerCase() as FindingType;
    if (!ALLOWED_TYPE.has(findingType)) findingType = 'ai_recommendation';
    let severity = String(row.severity || 'suggestion').toLowerCase();
    if (!ALLOWED_SEV.has(severity as (typeof SEVERITIES)[number])) severity = 'suggestion';
    if (severity === 'critical' && findingType !== 'verified_issue') severity = 'high';
    if (confidence < threshold) {
      findingType = 'manual_review';
      severity = severity === 'critical' || severity === 'high' ? 'medium' : severity;
    }
    const ref = boundReference(normalizeReference(row.standard_reference));
    const requiresManual = findingType === 'manual_review' || Boolean(row.requires_manual_review) || confidence < 0.75;
    out.push({
      source: 'AI',
      rule_code: ruleCode(findingType, category, title),
      category: category as FindingDraft['category'],
      severity: severity as FindingDraft['severity'],
      title: findingType === 'manual_review' ? `Review recommended: ${title}` : title,
      description,
      recommendation,
      page_url: String(row.page_url || pageUrl),
      viewport: row.viewport ? String(row.viewport) : null,
      selector: row.selector ? String(row.selector) : null,
      ai_confidence: confidence,
      finding_type: findingType,
      standard_reference: ref,
      requires_manual_review: requiresManual,
      suggested_ticket_type: String(row.suggested_ticket_type || (severity === 'suggestion' ? 'improvement' : 'BUG')),
      evidence_type: String(row.evidence_type || 'ai'),
      evidence: {
        finding_type: findingType,
        evidence_type: row.evidence_type || 'ai',
        standard_reference: ref,
        confidence,
      },
    });
  }
  return out;
}

const KNOWN_AUTHORITIES = [
  'WCAG',
  'W3C',
  'WHATWG',
  'Google Search',
  'web.dev',
  'Techantum Web Quality Standard',
  'Techantum Best Practice',
  'AI Recommendation',
  'Deterministic scanner',
  'Responsive design guidance',
];

function normalizeReference(value: unknown): WebMasterFinding['standard_reference'] {
  if (!value || typeof value !== 'object') return { name: 'AI Recommendation' };
  const row = value as Record<string, unknown>;
  const name = String(row.name || row.standard || '').trim();
  if (!name) return { name: 'AI Recommendation' };
  return {
    name,
    version: row.version ? String(row.version) : undefined,
    rule: String(row.rule || row.reference || '') || undefined,
    url: row.url ? String(row.url) : undefined,
  };
}

export function boundReference(ref: WebMasterFinding['standard_reference']): WebMasterFinding['standard_reference'] {
  if (!ref) return { name: 'AI Recommendation' };
  const known = KNOWN_AUTHORITIES.some((item) => ref.name.toLowerCase().includes(item.toLowerCase()));
  if (!known) return { name: 'Techantum Best Practice' };
  if (/wcag|w3c|whatwg|google|web\.dev/i.test(ref.name)) {
    const allowedRules = ['1.1.1', '1.3.1', '1.4.3', '3.3.2', '2.1.1', 'LCP', 'title-link', 'meta-description', 'h1'];
    if (!ref.rule || !allowedRules.some((rule) => ref.rule!.includes(rule))) {
      return { name: 'Techantum Best Practice' };
    }
  }
  return ref;
}

function ruleCode(type: FindingType, category: string, title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32);
  return `wm.${type}.${category}.${slug || 'finding'}`;
}

export function classifyDeterministic(finding: FindingDraft): WebMasterFinding {
  const suggestion = finding.severity === 'suggestion';
  return {
    ...finding,
    finding_type: suggestion ? 'best_practice' : 'verified_issue',
    standard_reference: suggestion
      ? { name: 'Techantum Best Practice' }
      : { name: 'Deterministic scanner', rule: finding.rule_code },
    requires_manual_review: false,
    suggested_ticket_type: suggestion ? 'improvement' : 'BUG',
    evidence_type: 'deterministic',
    evidence: { ...(finding.evidence || {}), finding_type: suggestion ? 'best_practice' : 'verified_issue' },
  };
}
