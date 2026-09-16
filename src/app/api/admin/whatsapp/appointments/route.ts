import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listAppointments } from '@/lib/whatsapp/appointments';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const url = new URL(request.url);
    const rows = await listAppointments({
      search: url.searchParams.get('search') || '',
      status: url.searchParams.get('status') || '',
    });
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load appointments' }, { status: 500 });
  }
}
