export type IssuePriority = 'critical' | 'high' | 'medium' | 'low';
export type CheckStatus = 'passed' | 'warning' | 'failed' | 'not_tested';

const WEIGHTS: Record<IssuePriority, number> = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 1,
};

/** Deterministic health score from open, automatically verified checks. Manual task status is ignored. */
export function seoHealthScore(
  issues: Array<{ status: CheckStatus; priority: IssuePriority; fix_status?: string }>,
) {
  let score = 100;
  for (const issue of issues) {
    if (issue.status === 'passed' || issue.status === 'not_tested') continue;
    if (issue.fix_status === 'verified') continue;
    const penalty = WEIGHTS[issue.priority] || 4;
    score -= issue.status === 'failed' ? penalty : Math.ceil(penalty / 2);
  }
  return Math.max(0, Math.min(100, score));
}
