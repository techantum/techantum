import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const status = new URL(req.url).searchParams.get('status');
  const params: unknown[] = [session.workspaceId];
  let where = 'd.workspace_id=$1';
  if (status) {
    params.push(status);
    where += ` AND d.status=$${params.length}`;
  }
  const { rows } = await query(
    `SELECT d.*, l.full_name AS lead_name FROM crm.documents d
     JOIN crm.leads l ON l.id=d.lead_id
     WHERE ${where}
     ORDER BY d.created_at DESC LIMIT 200`,
    params,
  );
  return ok(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  try {
    const body = await req.json();
    if (!body.leadId || !body.docType) return fail('leadId and docType required');
    // OCR assist only — never treat as official identity verification
    const ocrKey = process.env.CRM_OCR_API_KEY;
    const ocr = {
      provider: ocrKey ? process.env.CRM_OCR_PROVIDER || 'configured' : 'none',
      extracted: body.extractedFields || {},
      clarity: body.clarity || 'pending',
      note: ocrKey
        ? 'OCR provider configured. Human review still required. Not official identity verification.'
        : 'No OCR provider configured. Store document metadata only; human review required.',
    };
    const { rows } = await query(
      `INSERT INTO crm.documents (workspace_id, lead_id, doc_type, status, storage_path, ocr_payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
      [
        session.workspaceId,
        body.leadId,
        body.docType,
        body.status || 'needs_review',
        body.storagePath || null,
        JSON.stringify(ocr),
      ],
    );
    return created({ document: rows[0] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
