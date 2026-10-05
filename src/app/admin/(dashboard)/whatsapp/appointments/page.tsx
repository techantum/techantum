import { redirect } from 'next/navigation';

export default function WhatsAppAppointmentsRedirect() {
  redirect('/admin/whatsapp/leads?tab=APPOINTMENT_BOOKED');
}
