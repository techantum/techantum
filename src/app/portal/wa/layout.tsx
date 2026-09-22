import Link from 'next/link';

const NAV = [
  ['/portal/wa', 'Dashboard'],
  ['/portal/wa/phones', 'WhatsApp Numbers'],
  ['/portal/wa/templates', 'Templates'],
  ['/portal/wa/messages', 'Messages'],
  ['/portal/wa/inbox', 'Inbox'],
  ['/portal/wa/contacts', 'Contacts'],
  ['/portal/wa/campaigns', 'Campaigns'],
  ['/portal/wa/automations', 'Automations'],
  ['/portal/wa/analytics', 'Analytics'],
  ['/portal/wa/integrations', 'Integrations'],
  ['/portal/wa/billing', 'Billing'],
  ['/portal/wa/support', 'Support'],
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="lg:fixed lg:inset-y-0 lg:w-64 border-r border-slate-200 bg-white px-4 py-6">
        <p className="font-bricolage font-bold text-lg text-slate-900">Client Portal</p>
        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-6">WhatsApp Business</p>
        <nav className="space-y-1">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-800">
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/portal/wa/connect" className="mt-6 block rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100">
          Connect WhatsApp Business
        </Link>
        <Link href="/" className="mt-3 block px-3 text-xs text-slate-400 hover:text-slate-700">
          Back to website
        </Link>
      </aside>
      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">{children}</div>
      </main>
    </div>
  );
}
