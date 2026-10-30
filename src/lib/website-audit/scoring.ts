import type { Category, FindingDraft, ScoreWeights, Severity, SeverityPenalties } from './types';

export const DEFAULT_WEIGHTS: ScoreWeights = {
  seo: 20,
  accessibility: 15,
  performance: 15,
  ui: 15,
  ux: 0,
  responsive: 15,
  content: 10,
  forms: 10,
};

export const DEFAULT_PENALTIES: SeverityPenalties = {
  critical: 25,
  high: 12,
  medium: 6,
  low: 2,
  suggestion: 0,
};

const CAPS: Record<Category, number> = {
  seo: 70,
  accessibility: 70,
  performance: 70,
  ui: 70,
  ux: 50,
  responsive: 70,
  content: 60,
  forms: 60,
};

export function categoryScores(
  findings: FindingDraft[],
  penalties: SeverityPenalties = DEFAULT_PENALTIES
): Record<Category, number> {
  const buckets = new Map<Category, FindingDraft[]>();
  for (const finding of findings) {
    const list = buckets.get(finding.category) || [];
    list.push(finding);
    buckets.set(finding.category, list);
  }
  const scores = {} as Record<Category, number>;
  for (const category of Object.keys(DEFAULT_WEIGHTS) as Category[]) {
    const items = buckets.get(category) || [];
    let penalty = 0;
    const seen = new Set<string>();
    for (const item of items) {
      const key = `${item.rule_code}|${item.page_url || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      penalty += penalties[item.severity as Severity] || 0;
    }
    penalty = Math.min(penalty, CAPS[category]);
    scores[category] = Math.max(0, Math.min(100, 100 - penalty));
  }
  return scores;
}

export function overallScore(scores: Record<Category, number>, weights: ScoreWeights = DEFAULT_WEIGHTS): number {
  const usable = (Object.keys(weights) as Category[]).filter((key) => (weights[key] || 0) > 0);
  const totalWeight = usable.reduce((sum, key) => sum + (weights[key] || 0), 0) || 1;
  const mixed = usable.reduce((sum, key) => sum + (scores[key] || 0) * (weights[key] || 0), 0);
  return Math.round(Math.max(0, Math.min(100, mixed / totalWeight)));
}
