import { query } from './db';
import { enqueueJob } from './jobs';

export type DocType = 'aadhaar' | 'pan' | 'electricity_bill' | 'generic' | string;

/**
 * Assistive document checks only.
 * NOT official Aadhaar/PAN identity verification.
 */
export function analyzeDocument(input: {
  docType: DocType;
  leadName?: string | null;
  extracted?: Record<string, any>;
  clarityScore?: number;
}) {
  const extracted = input.extracted || {};
  const reasons: string[] = [];
  const mismatches: Array<{ field: string; expected?: string; found?: string; status: string }> = [];

  const clarity = typeof input.clarityScore === 'number' ? input.clarityScore : Number(extracted.clarity || 0.7);
  if (clarity < 0.55) reasons.push('Low image clarity / possible blur or crop');

  const requiredByType: Record<string, string[]> = {
    aadhaar: ['name', 'aadhaar_last4'],
    pan: ['name', 'pan'],
    electricity_bill: ['account_name', 'address', 'consumer_number'],
    generic: [],
  };
  const required = requiredByType[input.docType] || [];
  for (const field of required) {
    if (!extracted[field]) {
      reasons.push(`Missing field: ${field}`);
      mismatches.push({ field, status: 'missing' });
    }
  }

  const extractedName = String(extracted.name || extracted.account_name || '').toLowerCase();
  const leadName = String(input.leadName || '').toLowerCase();
  if (extractedName && leadName) {
    const leadParts = leadName.split(/\s+/).filter(Boolean);
    const overlap = leadParts.some((p) => extractedName.includes(p));
    if (!overlap) {
      mismatches.push({
        field: 'name',
        expected: input.leadName || undefined,
        found: extracted.name || extracted.account_name,
        status: 'mismatch',
      });
      reasons.push('Name mismatch vs lead — possible family-member / ownership exception');
    } else {
      mismatches.push({ field: 'name', status: 'match' });
    }
  }

  if (input.docType === 'pan' && extracted.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(String(extracted.pan))) {
    reasons.push('PAN format looks invalid');
    mismatches.push({ field: 'pan', found: String(extracted.pan), status: 'format_error' });
  }

  const needsHuman = reasons.length > 0 || mismatches.some((m) => m.status === 'mismatch' || m.status === 'missing');
  return {
    officialKyc: false,
    legalAuthorization: Boolean(process.env.CRM_KYC_PROVIDER && process.env.CRM_KYC_AUTHORIZATION_REF),
    clarity,
    complete: required.every((f) => Boolean(extracted[f])),
    mismatches,
    reasons,
    status: needsHuman ? 'needs_review' : 'assistive_ok',
    disclaimer: 'Assistive OCR/consistency checks only. Not official Aadhaar/PAN verification.',
  };
}

export async function requestHotLeadDocuments(workspaceId: string, leadId: string) {
  const lead = (await query(`SELECT * FROM crm.leads WHERE workspace_id=$1 AND id=$2`, [workspaceId, leadId])).rows[0];
  if (!lead) throw new Error('Lead not found');
  if (lead.qualification_status !== 'hot') {
    return { skipped: true, reason: 'Only hot leads auto-request KYC/utility documents' };
  }

  const types = ['aadhaar', 'pan', 'electricity_bill'];
  const created = [];
  for (const docType of types) {
    const { rows } = await query(
      `INSERT INTO crm.documents (workspace_id, lead_id, doc_type, status, ocr_payload, verification)
       VALUES ($1,$2,$3,'requested','{}'::jsonb,$4::jsonb)
       RETURNING *`,
      [
        workspaceId,
        leadId,
        docType,
        JSON.stringify({ requested_at: new Date().toISOString(), reason: 'hot_lead_verification' }),
      ],
    );
    created.push(rows[0]);
  }
  await query(`UPDATE crm.leads SET document_status='requested', updated_at=NOW() WHERE id=$1`, [leadId]);
  await query(
    `INSERT INTO crm.lead_activities (workspace_id, lead_id, activity_type, summary, payload)
     VALUES ($1,$2,'documents.requested','Requested Aadhaar, PAN and electricity bill for hot lead',$3::jsonb)`,
    [workspaceId, leadId, JSON.stringify({ types })],
  );
  await query(
    `INSERT INTO crm.tasks (workspace_id, lead_id, title, priority, status, due_at)
     VALUES ($1,$2,'Collect & verify customer documents','high','open', NOW() + INTERVAL '1 day')`,
    [workspaceId, leadId],
  );
  // Prefer WhatsApp document collection prompt via AI reply job if conversation exists
  await enqueueJob({
    workspaceId,
    jobType: 'workflow.trigger',
    payload: { trigger: 'document.requested', leadId },
  });
  return { skipped: false, documents: created };
}

export async function verifyUploadedDocument(workspaceId: string, documentId: string, extracted: Record<string, any>, clarityScore?: number) {
  const doc = (
    await query(
      `SELECT d.*, l.full_name AS lead_name, l.id AS lead_uuid
       FROM crm.documents d JOIN crm.leads l ON l.id=d.lead_id
       WHERE d.workspace_id=$1 AND d.id=$2`,
      [workspaceId, documentId],
    )
  ).rows[0];
  if (!doc) throw new Error('Document not found');

  const analysis = analyzeDocument({
    docType: doc.doc_type,
    leadName: doc.lead_name,
    extracted,
    clarityScore,
  });

  const { rows } = await query(
    `UPDATE crm.documents SET
      status=$3,
      ocr_payload=$4::jsonb,
      verification=$5::jsonb
     WHERE workspace_id=$1 AND id=$2
     RETURNING *`,
    [
      workspaceId,
      documentId,
      analysis.status === 'assistive_ok' ? 'ocr_extracted' : 'needs_review',
      JSON.stringify({ extracted, clarity: analysis.clarity }),
      JSON.stringify(analysis),
    ],
  );

  await query(
    `INSERT INTO crm.lead_activities (workspace_id, lead_id, activity_type, summary, payload)
     VALUES ($1,$2,'documents.verified_assistive',$3,$4::jsonb)`,
    [
      workspaceId,
      doc.lead_uuid,
      analysis.status === 'needs_review'
        ? 'Document flagged for human verification'
        : 'Document passed assistive checks',
      JSON.stringify(analysis),
    ],
  );

  if (analysis.status === 'needs_review') {
    await query(`UPDATE crm.leads SET document_status='needs_review' WHERE id=$1`, [doc.lead_uuid]);
  }
  return rows[0];
}
