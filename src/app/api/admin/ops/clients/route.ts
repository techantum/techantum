import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createClient, listClients } from '@/lib/ops/service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const search = new URL(request.url).searchParams.get('search') ?? undefined;
    return NextResponse.json(await listClients(search));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const body = await request.json();
    const result = await createClient(body, auth.user.id, Boolean(body.confirmDuplicate));
    if (result.duplicates.length && !result.client) {
      return NextResponse.json(
        { error: 'A client with similar information already exists.', duplicates: result.duplicates },
        { status: 409 }
      );
    }
    return NextResponse.json(result.client);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create client' }, { status: 400 });
  }
}
