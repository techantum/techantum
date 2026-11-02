import { getSession } from '@/lib/auth';
import { listLeads } from '@/lib/leads';
import { csvEscape } from '@/lib/normalize';
import { unauthorized } from '@/lib/http';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const url = new URL(req.url);
  const data = await listLeads({
    workspaceId: session.workspaceId,
    q: url.searchParams.get('q') || undefined,
    stage: url.searchParams.get('stage') || undefined,
    source: url.searchParams.get('source') || undefined,
    page: 1,
    pageSize: 5000,
  });
  const header = [
    'id',
    'full_name',
    'phone',
    'email',
    'source',
    'campaign',
    'validity_status',
    'qualification_status',
    'lead_score',
    'stage',
    'created_at',
  ];
  const lines = [header.join(',')];
  for (const row of data.items) {
    lines.push(
      [
        row.id,
        row.full_name,
        row.phone,
        row.email,
        row.source,
        row.campaign,
        row.validity_status,
        row.qualification_status,
        row.lead_score,
        row.stage_code,
        row.created_at,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads.csv"',
    },
  });
}
