import { generateWhatsAppReply, summarizeConversation } from './ai';
import { getAISettings } from './knowledge';
import {
  applyExtractedData,
  applyHandoff,
  findOrCreateContact,
  findOrCreateOpenConversation,
  getRecentMessages,
  isMessageProcessed,
  saveInboundMessage,
  saveOutboundMessage,
  updateConversationAfterAI,
  upsertLeadFromConversation,
} from './conversation';
import { sendWhatsAppSessionText } from './meta';
import type { InboundWhatsAppMessage } from './types';
import { applyGreetingPrefix, buildGreetingOpening, classifySession } from './greeting';

export { parseInboundMessages, parseStatusUpdates } from './webhook-utils';

export async function processInboundWhatsAppMessage(inbound: InboundWhatsAppMessage): Promise<void> {
  if (await isMessageProcessed(inbound.whatsapp_message_id)) return;

  const settings = await getAISettings();
  const contact = await findOrCreateContact({ phone: inbound.from, profileName: inbound.profile_name });
  const conversation = await findOrCreateOpenConversation(contact.id, settings.default_mode);

  await saveInboundMessage({
    conversationId: conversation.id,
    contactId: contact.id,
    inbound,
  });

  const shouldSkipAi =
    !settings.ai_enabled ||
    conversation.mode === 'HUMAN' ||
    !conversation.ai_enabled;

  if (shouldSkipAi) {
    console.warn('[whatsapp webhook] skipping AI reply', {
      ai_enabled: settings.ai_enabled,
      conversation_mode: conversation.mode,
      conversation_ai_enabled: conversation.ai_enabled,
    });
    if (conversation.mode === 'HUMAN' || conversation.handoff_required) {
      await applyHandoff(conversation.id, 'STAFF_MODE', settings.handoff_mode);
    }
    return;
  }

  const customerText = inbound.text || '';
  const recentMessages = await getRecentMessages(conversation.id, 20);
  const sessionKind = classifySession(recentMessages);

  const { reply, responseId } = await generateWhatsAppReply({
    customerMessage: customerText,
    contact,
    conversation,
    recentMessages,
    settings,
  });

  const greeting = buildGreetingOpening({ kind: sessionKind, contact });
  reply.reply_text = applyGreetingPrefix(reply.reply_text, greeting);

  const summary = settings.auto_conversation_summary
    ? await summarizeConversation(recentMessages, contact, reply, sessionKind)
    : undefined;

  await applyExtractedData(contact.id, conversation.id, reply.extracted_data);
  await updateConversationAfterAI(conversation.id, reply, responseId, summary);

  if (settings.auto_lead_creation) {
    await upsertLeadFromConversation({ contact, conversation, reply, summary });
  }

  const sendResult = await sendWhatsAppSessionText(contact.phone_number, reply.reply_text);
  if (!sendResult.ok) {
    console.error('[whatsapp webhook] send failed', sendResult.error_message);
  }
  await saveOutboundMessage({
    conversationId: conversation.id,
    contactId: contact.id,
    text: reply.reply_text,
    senderType: 'AI',
    providerMessageId: sendResult.provider_message_id,
    aiGenerated: true,
  });

  if (!sendResult.ok && sendResult.error_message) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    await createAdminClient()
      .from('whatsapp_messages')
      .update({ error_message: sendResult.error_message, delivery_status: 'FAILED' })
      .eq('conversation_id', conversation.id)
      .eq('sender_type', 'AI')
      .order('created_at', { ascending: false })
      .limit(1);
  }

  if (reply.handoff_required && settings.auto_handoff) {
    await applyHandoff(conversation.id, reply.handoff_reason, settings.handoff_mode);
  }
}
