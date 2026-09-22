import { headers } from 'next/headers';
import { getBranding } from '@/lib/cms';
import WhatsAppWidget from './WhatsAppWidget';

export default async function WhatsAppWidgetLoader() {
  const path = (await headers()).get('x-url-path') || '';
  if (path === '/login' || path.startsWith('/auth/') || path.startsWith('/admin') || path.startsWith('/portal')) return null;
  const branding = await getBranding();
  if (!branding.whatsapp_widget_enabled) return null;
  return (
    <WhatsAppWidget
      phoneNumber={branding.whatsapp_href}
      message={branding.whatsapp_widget_message}
      label="Chat with Techantum"
    />
  );
}
