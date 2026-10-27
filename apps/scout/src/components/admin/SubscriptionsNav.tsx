'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavIcon from '@/components/ui/NavIcon';

const TABS = [
  { href: '/subscriptions', label: 'Subscriptions', exact: true, icon: 'CreditCardIcon', key: '/subscriptions' },
  { href: '/subscriptions/subscribers', label: 'Subscribers', icon: 'UserGroupIcon', key: 'subscribers' },
  { href: '/subscriptions/features', label: 'Feature Catalog', icon: 'Squares2X2Icon', key: 'features' },
  { href: '/subscriptions/packages', label: 'Packages', icon: 'CubeIcon', key: 'packages' },
];

export default function SubscriptionsNav() {
  const pathname = usePathname() || '';
  return (
    <nav className="mb-5 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Subscription management">
      {TABS.map((tab, index) => {
        const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <NavIcon name={tab.icon} itemKey={tab.key} delay={index * 140} className="h-7 w-7 rounded-lg" size={14} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
