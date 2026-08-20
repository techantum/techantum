import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveOutboundMessage } from '@/lib/whatsapp/conversation';
import { sendWhatsAppSessionText } from '@/lib/whatsapp/meta';
import { logAudit } from '@/lib/whatsapp/admin-service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: 'Message text is required' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: conversation, error } = await supabase
      .from('whatsapp_conversations')
      .select('*, whatsapp_contacts(*)')
      .eq('id', id)
      .maybeSingle();
    if (error || !conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const contact = conversation.whatsapp_contacts as { id: string; phone_number: string };
    const sendResult = await sendWhatsAppSessionText(contact.phone_number, text);
    const message = await saveOutboundMessage({
      conversationId: id,
      contactId: contact.id,
      text,
      senderType: 'STAFF',
      providerMessageId: sendResult.provider_message_id,
    });

    if (!sendResult.ok) {
      await supabase
        .from('whatsapp_messages')
        .update({ delivery_status: 'FAILED', error_message: sendResult.error_message })
        .eq('id', message.id);
      return NextResponse.json({ error: sendResult.error_message || 'Send failed' }, { status: 502 });
    }

    await logAudit('staff_reply', 'conversation', id, auth.user.id, { message_id: message.id });
    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}
