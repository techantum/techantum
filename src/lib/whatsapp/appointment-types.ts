export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_DISCUSSION',
  'COMPLETED',
  'FOLLOW_UP',
  'NO_SHOW',
  'CANCELLED',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  IN_DISCUSSION: 'In discussion',
  COMPLETED: 'Discussion done',
  FOLLOW_UP: 'Follow-up',
  NO_SHOW: 'Could not reach',
  CANCELLED: 'Cancelled',
};

export interface WhatsAppAppointment {
  id: string;
  code: string;
  contact_id: string;
  conversation_id: string | null;
  phone: string;
  contact_name: string | null;
  service: string | null;
  requirement: string | null;
  requested_slot_text: string | null;
  scheduled_at: string | null;
  timezone: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppAppointmentUpdate {
  id: string;
  appointment_id: string;
  kind: 'STATUS' | 'NOTE' | 'BOOKED';
  status: string | null;
  body: string | null;
  client_message: string | null;
  sent_to_client: boolean;
  sent_at: string | null;
  send_error: string | null;
  created_by: string | null;
  created_at: string;
}
