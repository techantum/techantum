import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { addAppointmentUpdate, getAppointmentDetail } from '@/lib/whatsapp/appointments';
import { logAudit } from '@/lib/whatsapp/admin-service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const detail = await getAppointmentDetail(id);
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Not found' }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: string; body?: string; send_to_client?: boolean };
    const detail = await addAppointmentUpdate({
      id,
      status: body.status,
      body: body.body,
      sendToClient: body.send_to_client,
      userId: auth.user.id,
    });
    await logAudit('appointment_status', 'appointment', id, auth.user.id, {
      status: body.status,
      sent: body.send_to_client !== false,
    });
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 400 });
  }
}
