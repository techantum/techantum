import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPartnerWithInvite } from '@/lib/partner/service';
import type { CreatePartnerInput, PartnerType, PartnerTier } from '@/lib/partner/types';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();

    const input: CreatePartnerInput = {
      company_name: String(body.company_name || '').trim(),
      contact_name: String(body.contact_name || '').trim(),
      email: String(body.email || '').trim().toLowerCase(),
      phone: body.phone ? String(body.phone).trim() : undefined,
      partner_type: (body.partner_type || 'sales') as PartnerType,
      tier: (body.tier || 'silver') as PartnerTier,
      country: body.country ? String(body.country).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
    };

    if (!input.company_name || !input.contact_name || !input.email) {
      return NextResponse.json(
        { error: 'Company name, contact name, and email are required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const result = await createPartnerWithInvite(input);

    return NextResponse.json({
      partner: result.partner,
      inviteSent: result.inviteSent,
      inviteError: result.inviteError,
      message: result.inviteSent
        ? 'Partner created and invite email sent.'
        : 'Partner created but invite email failed. Use Resend invite.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create partner' },
      { status: 500 }
    );
  }
}
