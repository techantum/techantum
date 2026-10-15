import { NextResponse } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin/auth';
import { createMasterItem, listMasterItems, listMasterLists, updateMasterItem } from '@/lib/admin/master-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const url = new URL(request.url);
  const list = url.searchParams.get('list') || undefined;
  if (list) {
    const items = await listMasterItems(list, url.searchParams.get('active') !== '0');
    return NextResponse.json({ items });
  }
  const [lists, items] = await Promise.all([listMasterLists(), listMasterItems()]);
  return NextResponse.json({ lists, items });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const body = await request.json();
    const item = await createMasterItem(body);
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not add item' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Item is required' }, { status: 400 });
    const item = await updateMasterItem(String(body.id), body);
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not update item' }, { status: 400 });
  }
}
