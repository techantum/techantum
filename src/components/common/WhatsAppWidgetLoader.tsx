import { getBranding } from '@/lib/cms';
import WhatsAppWidget from './WhatsAppWidget';

export default async function WhatsAppWidgetLoader() {
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
