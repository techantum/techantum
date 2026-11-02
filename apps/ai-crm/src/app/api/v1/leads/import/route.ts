import { getSession, hasMinRole } from '@/lib/auth';
import { createOrUpsertLead } from '@/lib/leads';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || '';
    });
    return row;
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_manager')) return forbidden();
  try {
    const contentType = req.headers.get('content-type') || '';
    let rows: Record<string, string>[] = [];
    if (contentType.includes('application/json')) {
      const body = await req.json();
      rows = Array.isArray(body.rows) ? body.rows : [];
    } else {
      const text = await req.text();
      rows = parseCsv(text);
    }
    let created = 0;
    let merged = 0;
    for (const row of rows) {
      const result = await createOrUpsertLead({
        workspaceId: session.workspaceId,
        fullName: row.full_name || row.name || row.fullname,
        phone: row.phone || row.mobile,
        email: row.email,
        source: row.source || 'csv',
        campaign: row.campaign,
        externalSourceLeadId: row.external_id || row.external_source_lead_id,
        consentStatus: row.consent_status || 'granted',
        actorUserId: session.id,
        customAttributes: { import: true, raw: row },
      });
      if (result.created) created += 1;
      else merged += 1;
    }
    return ok({ imported: rows.length, created, merged });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Import failed', 500);
  }
}
