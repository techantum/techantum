import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { getWhatsAppAdapter } from '@/lib/whatsapp';
import { created, fail, forbidden, notFound, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  const { id } = await ctx.params;
  const body = await req.json();
  const text = String(body.body || '').trim();
  if (!text) return fail('Message body required');

  const conv = (
    await query(
      `SELECT c.*, l.phone_normalized FROM crm.conversations c
       JOIN crm.leads l ON l.id=c.lead_id
       WHERE c.workspace_id=$1 AND c.id=$2`,
      [session.workspaceId, id],
    )
  ).rows[0];
  if (!conv) return notFound();

  const adapter = getWhatsAppAdapter();
  const sent = await adapter.sendText({ to: conv.phone_normalized, body: text });
  const { rows } = await query(
    `INSERT INTO crm.messages (workspace_id, conversation_id, lead_id, direction, provider_message_id, body, status, payload)
     VALUES ($1,$2,$3,'outbound',$4,$5,'sent',$6::jsonb) RETURNING *`,
    [
      session.workspaceId,
      id,
      conv.lead_id,
      sent.messageId,
      text,
      JSON.stringify({ adapter: adapter.name, human: true, actor: session.id }),
    ],
  );
  await query(`UPDATE crm.conversations SET last_message_at=NOW(), mode='HUMAN' WHERE id=$1`, [id]);
  return created({ message: rows[0] });
}
