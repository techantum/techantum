import { createAdminClient } from '@/lib/supabase/admin';
import type { WhatsAppConversation, WhatsAppMessage } from './types';

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
