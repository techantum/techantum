import ConnectWhatsAppPanel from '@/components/whatsapp/ConnectWhatsAppPanel';

export default function PortalConnectPage() {
  return (
    <div className="max-w-xl">
      <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-2">WhatsApp Business</h1>
      <p className="text-sm text-slate-500 mb-6">
        Import your Meta Business, WhatsApp account and phone number in one Facebook flow.
      </p>
      <ConnectWhatsAppPanel />
    </div>
  );
}
