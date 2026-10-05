import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { exportLeadsCsv, listConversations } from '@/lib/whatsapp/admin-service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const search = new URL(request.url).searchParams.get('search') || '';
    const rows = await listConversations(search);
    const csv = exportLeadsCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="whatsapp-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Export failed' }, { status: 500 });
  }
}
