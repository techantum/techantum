import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createManualLead, logAudit } from '@/lib/whatsapp/admin-service';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      company?: string;
      service?: string;
      note?: string;
    };
    const detail = await createManualLead({
      name: body.name,
      phone: String(body.phone || ''),
      email: body.email,
      company: body.company,
      service: body.service,
      note: body.note,
      userId: auth.user.id,
    });
    await logAudit('manual_lead_created', 'conversation', detail.conversation.id, auth.user.id, { phone: body.phone });
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create lead' }, { status: 400 });
  }
}
