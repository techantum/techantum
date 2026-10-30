import { q } from '@/lib/finance/db';

type Row = Record<string, unknown>;

export const REVIEW_DECISIONS = ['confirmed', 'false_positive', 'ignored', 'severity_changed', 'recommendation_edited', 'fixed'] as const;

export async function recordFeedback(input: {
  findingId: string;
  userId: string;
  decision: string;
  reason?: string;
  severity?: string;
  recommendation?: string;
  status?: string;
}) {
  if (!REVIEW_DECISIONS.includes(input.decision as (typeof REVIEW_DECISIONS)[number])) {
    throw new Error('Unknown reviewer decision');
  }
  const { rows } = await q<Row>(undefined, `SELECT * FROM website_audit_findings WHERE id=$1`, [input.findingId]);
  const finding = rows[0];
  if (!finding) throw new Error('Finding not found');
  const original = finding.original_ai_output || {
    title: finding.title,
    description: finding.description,
    recommendation: finding.recommendation,
    severity: finding.severity,
    finding_type: finding.finding_type,
  };
  const status = input.status || mapStatus(input.decision);
  await q(
    undefined,
    `UPDATE website_audit_findings SET
      original_ai_output=COALESCE(original_ai_output, $2::jsonb),
      reviewer_id=$3, reviewed_at=NOW(), reviewer_reason=$4, reviewer_severity=$5, reviewer_recommendation=$6,
      severity=COALESCE($5, severity), recommendation=COALESCE($6, recommendation), status=$7
     WHERE id=$1`,
    [input.findingId, JSON.stringify(original), input.userId, input.reason || null, input.severity || null, input.recommendation || null, status]
  );
  await q(
    undefined,
    `INSERT INTO web_master_feedback (finding_id, audit_id, original_ai_output, ai_confidence, reviewer_decision, corrected_severity, corrected_recommendation, reason, reviewer_id)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9)`,
    [input.findingId, finding.audit_id, JSON.stringify(original), finding.ai_confidence, input.decision, input.severity || null, input.recommendation || null, input.reason || null, input.userId]
  );
  const next = await q<Row>(undefined, `SELECT * FROM website_audit_findings WHERE id=$1`, [input.findingId]);
  return next.rows[0];
}

function mapStatus(decision: string) {
  if (decision === 'false_positive') return 'false_positive';
  if (decision === 'ignored') return 'ignored';
  if (decision === 'fixed') return 'fixed';
  if (decision === 'confirmed') return 'accepted';
  return 'open';
}

export async function listFeedback(auditId?: string) {
  const { rows } = await q<Row>(
    undefined,
    auditId
      ? `SELECT * FROM web_master_feedback WHERE audit_id=$1 ORDER BY created_at DESC LIMIT 200`
      : `SELECT * FROM web_master_feedback ORDER BY created_at DESC LIMIT 200`,
    auditId ? [auditId] : []
  );
  return rows;
}
