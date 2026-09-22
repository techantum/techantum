import ConnectWhatsAppPanel from '@/components/whatsapp/ConnectWhatsAppPanel';
import { ONBOARDING_STEPS } from '@/lib/whatsapp-provider/config';

export default function PortalOnboardPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-2">WhatsApp Business API Onboarding</h1>
        <p className="text-sm text-slate-500">
          New users add a WhatsApp number through Facebook. Existing WABA users sign in with Facebook so TechAntum can import the account, numbers and templates.
        </p>
      </div>
      <ConnectWhatsAppPanel />
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bricolage font-semibold text-slate-900 mb-3">Onboarding checklist</h2>
        <ol className="space-y-2">
          {ONBOARDING_STEPS.map((step, index) => (
            <li key={step} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>
                {index + 1}. {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
