import { createAdminClient } from '@/lib/supabase/admin';
import { saveOutboundMessage } from './conversation';
import { sendWhatsAppSessionText } from './meta';
import { formatAppointmentNoteMessage, formatAppointmentStatusMessage } from './appointment-copy';
import { formatSlotForPeople, isSlotBookable, type ParsedSlot } from './appointment-slot';
import { serviceLabel, type QualificationState } from './qualification';
import type { WhatsAppContact, WhatsAppConversation } from './types';
import { createCalendarEvent } from './google-calendar';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
  type WhatsAppAppointment,
  type WhatsAppAppointmentUpdate,
} from './appointment-types';

export {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
  type WhatsAppAppointment,
  type WhatsAppAppointmentUpdate,
};

function contactName(contact: Pick<WhatsAppContact, 'first_name' | 'profile_name' | 'phone_number'>) {
  return (contact.first_name || contact.profile_name || contact.phone_number || 'there').replace(/^~/, '').trim();
}

export async function listAppointments(input: { search?: string; status?: string } = {}) {
  const supabase = createAdminClient();
  let query = supabase
    .from('whatsapp_appointments')
    .select('*, whatsapp_contacts(*)')
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (input.status && APPOINTMENT_STATUSES.includes(input.status as AppointmentStatus)) {
    query = query.eq('status', input.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = (data || []) as WhatsAppAppointment[];
  const q = (input.search || '').trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) =>
      [row.code, row.contact_name, row.phone, row.service, row.requirement, row.requested_slot_text]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }
  return rows;
}

export async function getAppointmentDetail(id: string) {
  const supabase = createAdminClient();
  const { data: appointment, error } = await supabase
    .from('whatsapp_appointments')
    .select('*, whatsapp_contacts(*)')
    .eq('id', id)
    .maybeSingle();
  if (error || !appointment) throw new Error(error?.message || 'Appointment not found');

  const { data: updates } = await supabase
    .from('whatsapp_appointment_updates')
    .select('*')
    .eq('appointment_id', id)
    .order('created_at', { ascending: false });

  return {
    appointment: appointment as WhatsAppAppointment,
    updates: (updates || []) as WhatsAppAppointmentUpdate[],
  };
}

export async function findConversationAppointment(conversationId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('whatsapp_appointments')
    .select('*')
    .eq('conversation_id', conversationId)
    .neq('status', 'CANCELLED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data || null) as WhatsAppAppointment | null;
}

export async function upsertChatAppointment(input: {
  contact: WhatsAppContact;
  conversation: WhatsAppConversation;
  qualification: QualificationState;
  slot: ParsedSlot;
}): Promise<WhatsAppAppointment> {
  if (!isSlotBookable(input.slot)) {
    throw new Error('Cannot confirm a call time that has already passed');
  }
  const supabase = createAdminClient();
  const existingId = input.qualification.appointment_id;
  const payload = {
    contact_id: input.contact.id,
    conversation_id: input.conversation.id,
    phone: input.contact.phone_number,
    contact_name: contactName(input.contact),
    service: serviceLabel(input.qualification.service),
    requirement: input.qualification.brief || null,
    requested_slot_text: input.slot.label,
    scheduled_at: input.slot.scheduledAt ? input.slot.scheduledAt.toISOString() : null,
    status: 'SCHEDULED' as AppointmentStatus,
  };

  const finish = async (appointment: WhatsAppAppointment) => {
    if (input.slot.scheduledAt) {
      await createCalendarEvent({
        summary: `Techantum call · ${appointment.contact_name || appointment.phone}`,
        description: `Phone: ${appointment.phone}\nService: ${appointment.service || '—'}\n${appointment.requirement || ''}\nCode: ${appointment.code}`,
        start: input.slot.scheduledAt,
      });
    }
    return appointment;
  };

  if (existingId) {
    const { data, error } = await supabase
      .from('whatsapp_appointments')
      .update(payload)
      .eq('id', existingId)
      .select('*')
      .single();
    if (!error && data) {
      await supabase.from('whatsapp_appointment_updates').insert({
        appointment_id: data.id,
        kind: 'BOOKED',
        status: 'SCHEDULED',
        body: `Call updated to ${input.slot.label}.`,
        client_message: null,
        sent_to_client: true,
        sent_at: new Date().toISOString(),
      });
      return finish(data as WhatsAppAppointment);
    }
  }

  const open = await findConversationAppointment(input.conversation.id);
  if (open && (open.status === 'SCHEDULED' || open.status === 'CONFIRMED' || open.status === 'FOLLOW_UP')) {
    const { data, error } = await supabase
      .from('whatsapp_appointments')
      .update(payload)
      .eq('id', open.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to update appointment');
    await supabase.from('whatsapp_appointment_updates').insert({
      appointment_id: data.id,
      kind: 'BOOKED',
      status: 'SCHEDULED',
      body: `Call updated to ${input.slot.label}.`,
      client_message: null,
      sent_to_client: true,
      sent_at: new Date().toISOString(),
    });
    return finish(data as WhatsAppAppointment);
  }

  const { data: code } = await supabase.rpc('whatsapp_next_appointment_code');
  const { data, error } = await supabase
    .from('whatsapp_appointments')
    .insert({
      ...payload,
      code: code || `APT-${Date.now()}`,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to create appointment');

  await supabase.from('whatsapp_appointment_updates').insert({
    appointment_id: data.id,
    kind: 'BOOKED',
    status: 'SCHEDULED',
    body: `Call booked for ${input.slot.label}.`,
    client_message: null,
    sent_to_client: true,
    sent_at: new Date().toISOString(),
  });

  return finish(data as WhatsAppAppointment);
}

export function getAdminAppointmentNotifyNumber() {
  return (process.env.WHATSAPP_APPOINTMENT_NOTIFY || '919951085555').replace(/\D/g, '');
}

export async function notifyAdminOfAppointment(appointment: WhatsAppAppointment) {
  const when = formatSlotForPeople(appointment.scheduled_at, appointment.requested_slot_text);
  const text = [
    'Techantum appointment update',
    '',
    `Code: ${appointment.code}`,
    `Name: ${appointment.contact_name || '—'}`,
    `Phone: ${appointment.phone}`,
    `When: ${when}`,
    `Status: ${appointment.status}`,
    `Service: ${appointment.service || '—'}`,
    `Requirement: ${appointment.requirement || '—'}`,
    '',
    `CMS: https://techantum.com/admin/whatsapp/appointments/${appointment.id}`,
  ].join('\n');

  const to = getAdminAppointmentNotifyNumber();
  const customerDigits = (appointment.phone || '').replace(/\D/g, '');
  if (to && to !== customerDigits) {
    const result = await sendWhatsAppSessionText(to, text);
    if (!result.ok) console.error('[whatsapp appointment] admin notify failed', result.error_message);
  }

  const { error } = await createAdminClient().from('notifications').insert({
    audience: 'admin',
    type: 'whatsapp_appointment',
    title: `Call booked · ${appointment.code}`,
    message: text,
    status: 'unread',
  });
  if (error) console.error('[whatsapp appointment] admin notification row failed', error.message);
}

async function sendClientMessage(appointment: WhatsAppAppointment, text: string, sender: 'STAFF' | 'SYSTEM' = 'STAFF') {
  if (!appointment.conversation_id) {
    return { ok: false, error: 'No conversation linked to this appointment' };
  }
  const sendResult = await sendWhatsAppSessionText(appointment.phone, text);
  await saveOutboundMessage({
    conversationId: appointment.conversation_id,
    contactId: appointment.contact_id,
    text,
    senderType: sender,
    providerMessageId: sendResult.provider_message_id,
    messageType: 'appointment_update',
  });
  if (!sendResult.ok) return { ok: false, error: sendResult.error_message || 'WhatsApp send failed' };
  return { ok: true, error: null as string | null };
}

export async function addAppointmentUpdate(input: {
  id: string;
  body?: string;
  status?: string;
  sendToClient?: boolean;
  userId?: string;
}) {
  const supabase = createAdminClient();
  const { appointment } = await getAppointmentDetail(input.id);
  const nextStatus =
    input.status && APPOINTMENT_STATUSES.includes(input.status as AppointmentStatus)
      ? (input.status as AppointmentStatus)
      : null;
  const notes = input.body?.trim() || '';
  const sendToClient = input.sendToClient !== false;
  const kind: WhatsAppAppointmentUpdate['kind'] = notes ? 'NOTE' : 'STATUS';

  let clientMessage: string | null = null;
  if (sendToClient) {
    clientMessage = notes
      ? formatAppointmentNoteMessage({ name: appointment.contact_name, notes })
      : nextStatus
        ? formatAppointmentStatusMessage({
            status: nextStatus,
            name: appointment.contact_name,
            when: appointment.scheduled_at,
            requestedSlot: appointment.requested_slot_text,
          })
        : null;
  }

  const patch: Record<string, unknown> = {};
  if (nextStatus) patch.status = nextStatus;
  if (notes) patch.notes = notes;
  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('whatsapp_appointments').update(patch).eq('id', appointment.id);
    if (error) throw new Error(error.message);
  }

  let sent = false;
  let sendError: string | null = null;
  let sentAt: string | null = null;
  if (clientMessage) {
    const result = await sendClientMessage({ ...appointment, ...patch } as WhatsAppAppointment, clientMessage);
    sent = result.ok;
    sendError = result.error;
    sentAt = result.ok ? new Date().toISOString() : null;
  }

  const { data: update, error } = await supabase
    .from('whatsapp_appointment_updates')
    .insert({
      appointment_id: appointment.id,
      kind,
      status: nextStatus,
      body: notes || (nextStatus ? `Status changed to ${APPOINTMENT_STATUS_LABELS[nextStatus]}` : null),
      client_message: clientMessage,
      sent_to_client: sent,
      sent_at: sentAt,
      send_error: sendError,
      created_by: input.userId || null,
    })
    .select('*')
    .single();
  if (error || !update) throw new Error(error?.message || 'Failed to save update');

  const detail = await getAppointmentDetail(appointment.id);
  return { ...detail, sendError };
}
