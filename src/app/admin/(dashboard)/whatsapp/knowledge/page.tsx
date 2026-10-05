import { redirect } from 'next/navigation';

export default function WhatsAppKnowledgeRedirect() {
  redirect('/admin/whatsapp/settings?tab=knowledge');
}
