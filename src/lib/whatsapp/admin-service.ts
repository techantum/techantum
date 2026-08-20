import { createAdminClient } from '@/lib/supabase/admin';
import type { LeadStage, WhatsAppConversation, WhatsAppMessage, ConversationStatus } from './types';

export async function listConversations(search = '') {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*, whatsapp_contacts(*)')
    .order('last_inbound_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message);
  let rows = (data || []) as WhatsAppConversation[];
  const q = search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => {
      const c = row.whatsapp_contacts;
      if (!c) return false;
      return [c.profile_name, c.phone_number, c.company_name, c.first_name, c.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }
  return rows;
}

export async function getConversationDetail(id: string) {
  const supabase = createAdminClient();
  const { data: conversation, error } = await supabase
    .from('whatsapp_conversations')
    .select('*, whatsapp_contacts(*)')
    .eq('id', id)
    .maybeSingle();
  if (error || !conversation) throw new Error(error?.message || 'Conversation not found');

  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  let lead = null;
  const contact = conversation.whatsapp_contacts as { lead_id?: string | null } | undefined;
  if (contact?.lead_id) {
    const { data } = await supabase.from('whatsapp_leads').select('*').eq('id', contact.lead_id).maybeSingle();
    lead = data;
  }

  return {
    conversation: conversation as WhatsAppConversation,
    messages: (messages || []) as WhatsAppMessage[],
    lead,
  };
}

const LEAD_STAGES: LeadStage[] = [
  'NEW',
  'ENGAGED',
  'REQUIREMENT_IDENTIFIED',
  'QUALIFIED',
  'PROPOSAL_REQUESTED',
  'HUMAN_FOLLOWUP',
  'CONVERTED',
  'LOST',
];

const CONVERSATION_STATUSES: ConversationStatus[] = ['OPEN', 'CLOSED', 'ARCHIVED'];

export async function updateConversationStatus(
  id: string,
  input: { lead_stage?: string; status?: string }
) {
  const supabase = createAdminClient();
  const updates: Record<string, string> = {};
  if (input.lead_stage && LEAD_STAGES.includes(input.lead_stage as LeadStage)) {
    updates.lead_stage = input.lead_stage;
  }
  if (input.status && CONVERSATION_STATUSES.includes(input.status as ConversationStatus)) {
    updates.status = input.status;
  }
  if (Object.keys(updates).length === 0) throw new Error('No valid status fields to update');

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update(updates)
    .eq('id', id)
    .select('*, whatsapp_contacts(*)')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to update status');
  return data as WhatsAppConversation;
}

export async function logAudit(action: string, entityType: string, entityId: string, userId?: string, metadata?: Record<string, unknown>) {
  const supabase = createAdminClient();
  await supabase.from('whatsapp_audit_log').insert({
    user_id: userId || null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata || null,
  });
}
