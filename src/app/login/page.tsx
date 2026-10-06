import { Suspense } from 'react';
import Icon from '@/components/ui/AppIcon';
import SiteLoginPanel from '@/components/auth/SiteLoginPanel';
import LoginLaptopPreview from '@/components/auth/LoginLaptopPreview';
import { getBranding } from '@/lib/cms';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    icon: 'CheckBadgeIcon',
    title: 'Official WhatsApp Business API',
    description: 'Secure, reliable, and approved by Meta.',
  },
  {
    icon: 'Cog6ToothIcon',
    title: 'Manage Numbers & Templates',
    description: 'Add numbers, create templates, and go live faster.',
  },
  {
    icon: 'ChartBarIcon',
    title: 'Conversations & Analytics',
    description: 'Manage chats, track performance, and grow your business.',
  },
  {
    icon: 'UserGroupIcon',
    title: 'Built for Business Teams',
    description: 'Give access to your team and maintain control.',
  },
];

const STATS = [
  { icon: 'PaperAirplaneIcon', value: '2M+', label: 'Messages Sent' },
  { icon: 'BuildingOffice2Icon', value: '10K+', label: 'Businesses Trust Us' },
  { icon: 'ShieldCheckIcon', value: '98%', label: 'Delivery Rate' },
  { icon: 'ClockIcon', value: '24/7', label: 'Customer Support' },
];

export default async function LoginPage() {
  const branding = await getBranding();

  return (
    <main className="page-main bg-[#F6F3EE]">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.85),transparent_45%)]" />
        <div className="relative mx-auto w-full px-4 py-10 sm:px-8 sm:py-14 lg:px-12 xl:px-16">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="lg:col-span-7">
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Client portal
                </span>
                <span className="h-px w-10 bg-secondary" />
              </div>
              <h1 className="font-bricolage text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl xl:text-6xl">
                Manage Your <span className="text-secondary">WhatsApp</span> Business API With Ease
              </h1>
              <p className="mt-5 max-w-xl font-inter text-base leading-relaxed text-slate-500 sm:text-lg">
                Access your WhatsApp Business API, manage numbers, templates, messages, and analytics — all in one place.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {FEATURES.map((feature) => (
                  <li key={feature.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 text-secondary">
                      <Icon name={feature.icon} size={18} />
                    </span>
                    <div>
                      <p className="font-inter text-sm font-semibold text-slate-900">{feature.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <LoginLaptopPreview />
            </div>

            <div className="lg:col-span-5">
              <Suspense fallback={<div className="h-[520px] animate-pulse rounded-3xl bg-white shadow-sm" />}>
                <SiteLoginPanel branding={branding} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto w-full px-4 py-8 sm:px-8 sm:py-10 lg:px-12 xl:px-16">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center text-secondary">
                  <Icon name={stat.icon} size={26} />
                </span>
                <p className="font-bricolage text-2xl font-bold text-slate-900 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 font-inter text-sm text-slate-500">{stat.label}</p>
                <span className="mx-auto mt-3 block h-0.5 w-8 bg-secondary" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
