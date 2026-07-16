import Icon from '@/components/ui/AppIcon';

export default function PartnerSupportPage() {
  return (
    <div className="max-w-xl">
      <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-2">Partner Support</h1>
      <p className="text-slate-500 mb-6">Get help with the Partner Portal and requirement submissions.</p>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <a
          href="mailto:info@techantum.com"
          className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors"
        >
          <Icon name="EnvelopeIcon" size={24} className="text-indigo-600" />
          <div>
            <p className="font-medium text-slate-900">Email Support</p>
            <p className="text-sm text-slate-500">info@techantum.com</p>
          </div>
        </a>
        <a
          href="mailto:sales@techantum.com"
          className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors"
        >
          <Icon name="PhoneIcon" size={24} className="text-indigo-600" />
          <div>
            <p className="font-medium text-slate-900">Sales Team</p>
            <p className="text-sm text-slate-500">sales@techantum.com</p>
          </div>
        </a>
      </div>
    </div>
  );
}
