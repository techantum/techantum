import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('partners')
    .select('*, partner_users(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const allowed: Record<string, unknown> = {};
  if (body.status) allowed.status = body.status;
  if (body.tier) allowed.tier = body.tier;
  if (body.notes !== undefined) allowed.notes = body.notes;
  if (body.phone !== undefined) allowed.phone = body.phone;
  if (body.company_name) allowed.company_name = body.company_name;
  if (body.contact_name) allowed.contact_name = body.contact_name;
  if (body.country !== undefined) allowed.country = body.country;

  const { data, error } = await supabase
    .from('partners')
    .update(allowed)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.status === 'suspended') {
    await supabase.from('partner_users').update({ status: 'suspended' }).eq('partner_id', id);
  } else if (body.status === 'active') {
    await supabase.from('partner_users').update({ status: 'active' }).eq('partner_id', id);
  }

  await supabase.from('partner_activity_logs').insert({
    partner_id: id,
    action: 'partner_updated',
    metadata: { changes: allowed },
  });

  return NextResponse.json(data);
}
