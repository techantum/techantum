'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/subscriptions', label: 'Subscriptions', exact: true },
  { href: '/subscriptions/subscribers', label: 'Subscribers' },
  { href: '/subscriptions/features', label: 'Feature Catalog' },
  { href: '/subscriptions/packages', label: 'Packages' },
];

export default function SubscriptionsNav() {
  const pathname = usePathname() || '';
  return (
    <nav className="mb-5 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Subscription management">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
