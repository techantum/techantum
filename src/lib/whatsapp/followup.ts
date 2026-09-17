import { generateAIChat } from '@/lib/ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRecentMessages, saveOutboundMessage } from './conversation';
import { getAISettings } from './knowledge';
import { sendWhatsAppSessionText } from './meta';
import { isRepeatReply, normalizeQualification } from './qualification';
import type { AISettings, WhatsAppContact, WhatsAppConversation } from './types';
import { buildFollowupMessage, isFollowupDue } from './followup-schedule';

export {
  FOLLOWUP_SESSION_HOURS,
  buildFollowupMessage,
  followupDelayHours,
  isFollowupDue,
  isFollowupWindow,
} from './followup-schedule';

export async function polishFollowupMessage(base: string, transcript: string): Promise<string> {
  try {
    const generated = await generateAIChat({
      purpose: 'whatsapp_followup',
      temperature: 0.3,
      maxTokens: 180,
      timeoutMs: 8000,
      messages: [
        {
          role: 'system',
          content:
            'Write one short WhatsApp follow-up in simple Indian English. Start with a time-of-day greeting. Ask one relevant question based on the previous chat. Do not repeat the customer\'s words. Do not mention price or budget. Do not restart the whole conversation. Plain text only.',
        },
        {
          role: 'user',
          content: `Draft to improve:\n${base}\n\nRecent chat:\n${transcript.slice(-1800)}`,
        },
      ],
    });
    const text = generated.text.trim();
    if (!text || text.length > 600) return base;
    if (/shall i ask someone to call/i.test(text) && /team will call you/i.test(base)) return base;
    return text;
  } catch {
    return base;
  }
}

type OpenConversation = WhatsAppConversation & { whatsapp_contacts?: WhatsAppContact | null };

export async function runWhatsAppFollowups(now = new Date()): Promise<{ checked: number; sent: number; skipped: number }> {
  const settings = await getAISettings();
  if (!settings.followup_enabled) return { checked: 0, sent: 0, skipped: 0 };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('whatsapp_conversations')
    .select('*, whatsapp_contacts(*)')
    .eq('status', 'OPEN')
    .neq('mode', 'HUMAN')
    .order('last_outbound_at', { ascending: true })
    .limit(40);

  const rows = (data || []) as OpenConversation[];
  let sent = 0;
  let skipped = 0;

  for (const conversation of rows) {
    const result = await sendFollowupIfDue(conversation, settings, now);
    if (result === 'sent') sent += 1;
    else skipped += 1;
  }

  return { checked: rows.length, sent, skipped };
}

async function sendFollowupIfDue(
  conversation: OpenConversation,
  settings: AISettings,
  now: Date
): Promise<'sent' | 'skipped'> {
  if (!conversation.ai_enabled || conversation.mode === 'HUMAN') return 'skipped';

  const messages = await getRecentMessages(conversation.id, 12);
  const lastOutbound = [...messages].reverse().find((m) => m.sender_type === 'AI' || m.sender_type === 'STAFF');
  const check = isFollowupDue({
    now,
    lastInboundAt: conversation.last_inbound_at,
    lastOutboundAt: conversation.last_outbound_at,
    followupCount: conversation.followup_count || 0,
    firstHours: settings.followup_first_hours,
    secondHours: settings.followup_second_hours,
    maxFollowups: settings.followup_max,
    startHour: settings.followup_start_hour,
    endHour: settings.followup_end_hour,
    lastOutboundSender: lastOutbound?.sender_type || null,
  });
  if (!check.due) return 'skipped';

  const contact = conversation.whatsapp_contacts;
  if (!contact?.phone_number) return 'skipped';

  const qualification = normalizeQualification(conversation.qualification);
  let body = buildFollowupMessage({
    qualification,
    contact,
    now,
    attempt: conversation.followup_count || 0,
  });
  const transcript = messages
    .map((m) => `${m.sender_type}: ${m.text_content || ''}`)
    .join('\n');
  body = await polishFollowupMessage(body, transcript);
  if (isRepeatReply(lastOutbound?.text_content, body)) return 'skipped';

  const count = conversation.followup_count || 0;
  const supabase = createAdminClient();
  const { data: locked } = await supabase
    .from('whatsapp_conversations')
    .update({
      followup_count: count + 1,
      last_followup_at: now.toISOString(),
    })
    .eq('id', conversation.id)
    .eq('followup_count', count)
    .select('id')
    .maybeSingle();
  if (!locked) return 'skipped';

  const sendResult = await sendWhatsAppSessionText(contact.phone_number, body);
  await saveOutboundMessage({
    conversationId: conversation.id,
    contactId: contact.id,
    text: body,
    senderType: 'AI',
    providerMessageId: sendResult.provider_message_id,
    aiGenerated: true,
    messageType: 'followup',
  });
  if (!sendResult.ok) {
    console.warn('[whatsapp followup] send failed', conversation.id, sendResult.error_message);
    return 'skipped';
  }
  return 'sent';
}
