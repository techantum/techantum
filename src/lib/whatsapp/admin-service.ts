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
    .select('id, code, status, conversation_id, created_at, scheduled_at')
    .in(
      'conversation_id',
      rows.map((row) => row.id)
    )
    .neq('status', 'CANCELLED')
    .order('created_at', { ascending: false });

  const latest = new Map<string, { id: string; code: string; status: string; scheduled_at?: string | null }>();
  for (const appointment of data || []) {
    const conversationId = String(appointment.conversation_id || '');
    if (!conversationId || latest.has(conversationId)) continue;
    latest.set(conversationId, {
      id: String(appointment.id),
      code: String(appointment.code),
      status: String(appointment.status),
      scheduled_at: appointment.scheduled_at ? String(appointment.scheduled_at) : null,
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
  rows = await attachLastMessages(rows);
  return attachAppointments(rows);
}

async function attachLastMessages(rows: WhatsAppConversation[]) {
  if (rows.length === 0) return rows;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('conversation_id, text_content, created_at, direction')
    .in(
      'conversation_id',
      rows.map((row) => row.id),
    )
    .order('created_at', { ascending: false })
    .limit(Math.min(rows.length * 8, 800));

  const latest = new Map<string, { text_content: string | null; created_at: string }>();
  const unread = new Map<string, number>();
  for (const row of rows) {
    const inbound = row.last_inbound_at ? new Date(row.last_inbound_at).getTime() : 0;
    const outbound = row.last_outbound_at ? new Date(row.last_outbound_at).getTime() : 0;
    unread.set(row.id, inbound > outbound ? 1 : 0);
  }
  for (const message of data || []) {
    const conversationId = String(message.conversation_id || '');
    if (!conversationId || latest.has(conversationId)) continue;
    latest.set(conversationId, {
      text_content: message.text_content ? String(message.text_content) : null,
      created_at: String(message.created_at),
    });
  }

  return rows.map((row) => ({
    ...row,
    last_message_preview: latest.get(row.id)?.text_content || null,
    last_message_at: latest.get(row.id)?.created_at || row.last_inbound_at || row.last_outbound_at,
    unread_count: unread.get(row.id) || 0,
  }));
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
  'IN_DISCUSSION',
  'QUALIFIED',
  'APPOINTMENT_BOOKED',
  'CONVERTED',
  'LOST',
  'ENGAGED',
  'REQUIREMENT_IDENTIFIED',
  'PROPOSAL_REQUESTED',
  'HUMAN_FOLLOWUP',
];

const CONVERSATION_STATUSES: ConversationStatus[] = ['OPEN', 'CLOSED', 'ARCHIVED'];

export async function updateConversationStatus(
  id: string,
  input: { lead_stage?: string; status?: string; assigned_user_id?: string | null }
) {
  const supabase = createAdminClient();
  const updates: Record<string, string | null> = {};
  if (input.lead_stage && LEAD_STAGES.includes(input.lead_stage as LeadStage)) {
    updates.lead_stage = input.lead_stage;
  }
  if (input.status && CONVERSATION_STATUSES.includes(input.status as ConversationStatus)) {
    updates.status = input.status;
  }
  if ('assigned_user_id' in input) {
    updates.assigned_user_id = input.assigned_user_id || null;
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

export async function createManualLead(input: {
  name?: string;
  phone: string;
  email?: string;
  company?: string;
  service?: string;
  note?: string;
  userId?: string;
}) {
  const { findOrCreateContact, findOrCreateOpenConversation } = await import('./conversation');
  const phone = input.phone.trim();
  if (!phone) throw new Error('Phone number is required');

  const contact = await findOrCreateContact({ phone, profileName: input.name });
  const supabase = createAdminClient();
  const contactUpdates: Record<string, string> = {};
  if (input.name) contactUpdates.first_name = input.name;
  if (input.email) contactUpdates.email = input.email;
  if (input.company) contactUpdates.company_name = input.company;
  if (Object.keys(contactUpdates).length) {
    await supabase.from('whatsapp_contacts').update(contactUpdates).eq('id', contact.id);
  }

  const conversation = await findOrCreateOpenConversation(contact.id, 'HUMAN');
  const qualification = input.service
    ? {
        step: 'purpose',
        service: input.service,
        prospect: 'UNKNOWN',
        prospect_reason: 'Created manually from Leads',
      }
    : null;
  await supabase
    .from('whatsapp_conversations')
    .update({
      lead_stage: 'NEW',
      mode: 'HUMAN',
      qualification,
    })
    .eq('id', conversation.id);

  if (input.note?.trim()) {
    await addConversationNote(conversation.id, input.note.trim(), input.userId);
  }

  const { data: codeRow } = await supabase.rpc('whatsapp_next_lead_code');
  if (!contact.lead_id) {
    const { data: lead } = await supabase
      .from('whatsapp_leads')
      .insert({
        lead_code: typeof codeRow === 'string' ? codeRow : `TL-${Date.now()}`,
        contact_id: contact.id,
        conversation_id: conversation.id,
        phone: contact.phone_number,
        name: input.name || contact.first_name || contact.profile_name,
        company: input.company || contact.company_name,
        email: input.email || contact.email,
        service: input.service || null,
        source: 'MANUAL',
        lead_stage: 'NEW',
        status: 'NEW',
      })
      .select('id')
      .single();
    if (lead?.id) await supabase.from('whatsapp_contacts').update({ lead_id: lead.id }).eq('id', contact.id);
  }

  return getConversationDetail(conversation.id);
}

export function exportLeadsCsv(rows: WhatsAppConversation[]) {
  const header = ['Name', 'Phone', 'Email', 'Company', 'Last message', 'Service', 'Lead status', 'Appointment', 'Updated'];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) => {
    const contact = row.whatsapp_contacts;
    const q = row.qualification as { service?: string } | null;
    return [
      contact?.first_name || contact?.profile_name || '',
      contact?.phone_number || '',
      contact?.email || '',
      contact?.company_name || '',
      row.last_message_preview || '',
      q?.service || '',
      row.lead_stage,
      row.appointment?.code || '',
      row.last_inbound_at || row.created_at || '',
    ]
      .map(escape)
      .join(',');
  });
  return [header.join(','), ...lines].join('\n');
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
