import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeWhatsAppNumber } from '@/lib/ops/phone';
import type {
  AIReplyStructured,
  InboundWhatsAppMessage,
  WhatsAppContact,
  WhatsAppConversation,
  WhatsAppMessage,
} from './types';

export async function isMessageProcessed(whatsappMessageId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('whatsapp_message_id', whatsappMessageId)
    .maybeSingle();
  return Boolean(data);
}

export async function findOrCreateContact(input: {
  phone: string;
  profileName?: string;
}): Promise<WhatsAppContact> {
  const supabase = createAdminClient();
  const phone = normalizeWhatsAppNumber(input.phone) || input.phone;

  const { data: existing } = await supabase.from('whatsapp_contacts').select('*').eq('phone_number', phone).maybeSingle();
  if (existing) {
    const updates: Record<string, string> = { last_contact_at: new Date().toISOString() };
    if (input.profileName && !existing.profile_name) updates.profile_name = input.profileName;
    await supabase.from('whatsapp_contacts').update(updates).eq('id', existing.id);
    return { ...existing, ...updates } as WhatsAppContact;
  }

  const { data: opsClient } = await supabase
    .from('ops_clients')
    .select('id, name, email, location, whatsapp_number')
    .eq('whatsapp_number', phone)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from('whatsapp_contacts')
    .insert({
      phone_number: phone,
      profile_name: input.profileName || null,
      first_name: input.profileName || null,
      client_id: opsClient?.id || null,
      email: opsClient?.email || null,
      location: opsClient?.location || null,
    })
    .select('*')
    .single();

  if (error || !created) throw new Error(error?.message || 'Failed to create WhatsApp contact');
  return created as WhatsAppContact;
}

export async function findOrCreateOpenConversation(contactId: string, defaultMode: 'AI' | 'HYBRID' | 'HUMAN' = 'AI') {
  const supabase = createAdminClient();
  const { data: open } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('contact_id', contactId)
    .eq('status', 'OPEN')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) return open as WhatsAppConversation;

  const { data: created, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      contact_id: contactId,
      status: 'OPEN',
      mode: defaultMode,
      ai_enabled: defaultMode !== 'HUMAN',
    })
    .select('*')
    .single();

  if (error || !created) throw new Error(error?.message || 'Failed to create conversation');
  return created as WhatsAppConversation;
}

export async function saveInboundMessage(input: {
  conversationId: string;
  contactId: string;
  inbound: InboundWhatsAppMessage;
}): Promise<WhatsAppMessage> {
  const supabase = createAdminClient();
  const text =
    input.inbound.text ||
    (input.inbound.type !== 'text'
      ? `[Received ${input.inbound.type}${input.inbound.media_id ? ` attachment` : ''}]`
      : '');

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: input.conversationId,
      contact_id: input.contactId,
      whatsapp_message_id: input.inbound.whatsapp_message_id,
      direction: 'INBOUND',
      sender_type: 'CUSTOMER',
      message_type: input.inbound.type,
      text_content: text,
      media_id: input.inbound.media_id || null,
      media_mime_type: input.inbound.media_mime_type || null,
      delivery_status: 'RECEIVED',
      raw_payload: input.inbound.raw,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to save inbound message');

  await supabase
    .from('whatsapp_conversations')
    .update({ last_inbound_at: new Date().toISOString() })
    .eq('id', input.conversationId);

  return data as WhatsAppMessage;
}

export async function saveOutboundMessage(input: {
  conversationId: string;
  contactId: string;
  text: string;
  senderType: 'AI' | 'STAFF' | 'SYSTEM';
  providerMessageId?: string | null;
  aiGenerated?: boolean;
}): Promise<WhatsAppMessage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: input.conversationId,
      contact_id: input.contactId,
      whatsapp_message_id: input.providerMessageId || null,
      direction: 'OUTBOUND',
      sender_type: input.senderType,
      message_type: 'text',
      text_content: input.text,
      delivery_status: input.providerMessageId ? 'SENT' : 'FAILED',
      ai_generated: input.aiGenerated ?? false,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to save outbound message');

  await supabase
    .from('whatsapp_conversations')
    .update({ last_outbound_at: new Date().toISOString() })
    .eq('id', input.conversationId);

  return data as WhatsAppMessage;
}

export async function getRecentMessages(conversationId: string, limit = 20): Promise<WhatsAppMessage[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data || []) as WhatsAppMessage[];
}

export async function applyExtractedData(contactId: string, conversationId: string, extracted: AIReplyStructured['extracted_data']) {
  const supabase = createAdminClient();
  const contactUpdates: Record<string, string> = {};
  if (extracted.name) contactUpdates.first_name = extracted.name;
  if (extracted.company) contactUpdates.company_name = extracted.company;
  if (extracted.email) contactUpdates.email = extracted.email;
  if (extracted.location) contactUpdates.location = extracted.location;
  if (Object.keys(contactUpdates).length > 0) {
    await supabase.from('whatsapp_contacts').update(contactUpdates).eq('id', contactId);
  }

  if (extracted.requirement || extracted.service) {
    await supabase.from('whatsapp_conversations').update({ lead_stage: 'REQUIREMENT_IDENTIFIED' }).eq('id', conversationId);
  }
}

export async function upsertLeadFromConversation(input: {
  contact: WhatsAppContact;
  conversation: WhatsAppConversation;
  reply: AIReplyStructured;
  summary?: string;
}) {
  const supabase = createAdminClient();
  const { contact, conversation, reply } = input;
  const extracted = reply.extracted_data;

  const meaningful =
    reply.handoff_required ||
    extracted.requirement ||
    extracted.service ||
    ['QUALIFIED', 'PROPOSAL_REQUESTED', 'HUMAN_FOLLOWUP', 'REQUIREMENT_IDENTIFIED'].includes(String(reply.lead_stage));

  if (!meaningful) return null;

  if (contact.lead_id) {
    await supabase
      .from('whatsapp_leads')
      .update({
        name: extracted.name || contact.first_name || contact.profile_name,
        company: extracted.company || contact.company_name,
        email: extracted.email || contact.email,
        location: extracted.location || contact.location,
        service: extracted.service,
        requirement: extracted.requirement,
        project_type: extracted.project_type,
        timeline: extracted.timeline,
        budget: extracted.budget,
        lead_stage: reply.lead_stage,
        status: reply.handoff_required ? 'HUMAN_FOLLOWUP' : 'ENGAGED',
        ai_summary: input.summary || undefined,
        conversation_id: conversation.id,
      })
      .eq('id', contact.lead_id);
    return contact.lead_id;
  }

  const { data: codeRow } = await supabase.rpc('whatsapp_next_lead_code');
  const leadCode = typeof codeRow === 'string' ? codeRow : `TL-${Date.now()}`;

  const { data: lead, error } = await supabase
    .from('whatsapp_leads')
    .insert({
      lead_code: leadCode,
      contact_id: contact.id,
      conversation_id: conversation.id,
      phone: contact.phone_number,
      name: extracted.name || contact.first_name || contact.profile_name,
      company: extracted.company || contact.company_name,
      email: extracted.email || contact.email,
      location: extracted.location || contact.location,
      service: extracted.service,
      requirement: extracted.requirement,
      project_type: extracted.project_type,
      timeline: extracted.timeline,
      budget: extracted.budget,
      lead_stage: reply.lead_stage,
      status: reply.handoff_required ? 'HUMAN_FOLLOWUP' : 'NEW',
      ai_summary: input.summary || null,
      ops_client_id: contact.client_id,
    })
    .select('id')
    .single();

  if (error || !lead) return null;
  await supabase.from('whatsapp_contacts').update({ lead_id: lead.id }).eq('id', contact.id);
  return lead.id;
}

export async function applyHandoff(conversationId: string, reason: string | null, handoffMode: 'HUMAN' | 'HYBRID') {
  const supabase = createAdminClient();
  await supabase
    .from('whatsapp_conversations')
    .update({
      handoff_required: true,
      handoff_reason: reason,
      mode: handoffMode,
      ai_enabled: handoffMode === 'HYBRID',
      lead_stage: 'HUMAN_FOLLOWUP',
    })
    .eq('id', conversationId);
}

export async function updateConversationAfterAI(
  conversationId: string,
  reply: AIReplyStructured,
  responseId: string | null,
  summary?: string,
) {
  const supabase = createAdminClient();
  await supabase
    .from('whatsapp_conversations')
    .update({
      intent: reply.intent,
      lead_stage: reply.lead_stage,
      last_ai_response_id: responseId,
      conversation_summary: summary || undefined,
      handoff_required: reply.handoff_required,
      handoff_reason: reply.handoff_reason,
    })
    .eq('id', conversationId);
}
