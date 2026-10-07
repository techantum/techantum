import Icon from '@/components/ui/AppIcon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function PartnerSupportPage() {
  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        kicker="Partner portal"
        title="Partner support"
        description="Get help with the partner portal and requirement submissions."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:info@techantum.com"
          className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-secondary/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-white">
            <Icon name="EnvelopeIcon" size={20} />
          </span>
          <div>
            <p className="font-medium text-slate-900">Email Support</p>
            <p className="text-sm text-slate-500">info@techantum.com</p>
          </div>
        </a>
        <a
          href="mailto:sales@techantum.com"
          className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-secondary/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-white">
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
