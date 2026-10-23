import Icon from '@/components/ui/AppIcon';
import { PartnerPageHero, partnerCard } from '@/components/partner/PartnerUi';

export default function PartnerSupportPage() {
  return (
    <div className="w-full space-y-5">
      <PartnerPageHero
        title="Partner support"
        description="Get help with the partner portal and requirement submissions."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <a href="mailto:info@techantum.com" className={`flex items-center gap-4 ${partnerCard} p-5 transition hover:border-secondary/40`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Icon name="EnvelopeIcon" size={20} />
          </span>
          <div>
            <p className="font-medium text-slate-900">Email Support</p>
            <p className="text-sm text-slate-500">info@techantum.com</p>
          </div>
        </a>
        <a href="mailto:sales@techantum.com" className={`flex items-center gap-4 ${partnerCard} p-5 transition hover:border-secondary/40`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600">
            <Icon name="PhoneIcon" size={20} />
          </span>
          <div>
            <p className="font-medium text-slate-900">Sales Team</p>
            <p className="text-sm text-slate-500">sales@techantum.com</p>
          </div>
        </a>
      </div>
    </div>
  );
}
