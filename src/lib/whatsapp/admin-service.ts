import { createAdminClient } from '@/lib/supabase/admin';
import { findConversationAppointment } from './appointments';
import type {
  LeadStage,
  WhatsAppConversation,
  WhatsAppConversationNote,
  WhatsAppMessage,
  ConversationStatus,
} from './types';

async function attachAppointments(rows: WhatsAppConversation[]) {
  if (rows.length === 0) return rows;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('whatsapp_appointments')
    .select('id, code, status, conversation_id, created_at')
    .in(
      'conversation_id',
      rows.map((row) => row.id)
    )
    .neq('status', 'CANCELLED')
    .order('created_at', { ascending: false });

  const latest = new Map<string, { id: string; code: string; status: string }>();
  for (const appointment of data || []) {
    const conversationId = String(appointment.conversation_id || '');
    if (!conversationId || latest.has(conversationId)) continue;
    latest.set(conversationId, {
      id: String(appointment.id),
      code: String(appointment.code),
      status: String(appointment.status),
    });
  }

  return rows.map((row) => ({ ...row, appointment: latest.get(row.id) || null }));
}

export async function listConversations(search = '') {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*, whatsapp_contacts(*)')
    .order('last_inbound_at', { ascending: false, nullsFirst: false })
    .limit(200);

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
  return attachAppointments(rows);
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
    appointment: conversation.id ? await findConversationAppointment(conversation.id) : null,
    notes: conversation.id ? await listConversationNotes(conversation.id) : [],
  };
}

export async function listConversationNotes(conversationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('whatsapp_conversation_notes')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as WhatsAppConversationNote[];
}

export async function addConversationNote(conversationId: string, body: string, userId?: string) {
  const text = body.trim();
  if (!text) throw new Error('Write a note before saving.');
  const supabase = createAdminClient();
  const { data: conversation, error: convError } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle();
  if (convError || !conversation) throw new Error(convError?.message || 'Conversation not found');

  const { data, error } = await supabase
    .from('whatsapp_conversation_notes')
    .insert({
      conversation_id: conversationId,
      body: text,
      created_by: userId || null,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to save note');
  return data as WhatsAppConversationNote;
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
