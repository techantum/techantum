import { Suspense } from 'react';
import Icon from '@/components/ui/AppIcon';
import SiteLoginPanel from '@/components/auth/SiteLoginPanel';
import { getBranding } from '@/lib/cms';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    icon: 'Squares2X2Icon',
    title: 'My Dashboard',
    description: 'See your account, updates, and activity in one place.',
  },
  {
    icon: 'ChatBubbleLeftRightIcon',
    title: 'Stay connected',
    description: 'Reach the Techantum team and keep conversations together.',
  },
  {
    icon: 'DocumentTextIcon',
    title: 'Your workspace',
    description: 'Access the tools already available on your account.',
  },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const branding = await getBranding();
  const mode = (await searchParams).mode;
  const isSignup = mode === 'signup';

  return (
    <main className="page-main bg-[#F6F3EE]">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.85),transparent_45%)]" />
        <div className="relative mx-auto w-full px-4 py-10 sm:px-8 sm:py-14 lg:px-12 xl:px-16">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="lg:col-span-7">
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  My Account
                </span>
                <span className="h-px w-10 bg-secondary" />
              </div>
              <h1 className="font-bricolage text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl xl:text-6xl">
                {isSignup ? 'Create Your Account' : 'Welcome Back'}
              </h1>
              <p className="mt-5 max-w-xl font-inter text-base leading-relaxed text-slate-500 sm:text-lg">
                {isSignup
                  ? 'Join Techantum to manage your projects and stay connected with our team.'
                  : 'Sign in to your Techantum account.'}
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
            </div>

            <div className="lg:col-span-5">
              <Suspense fallback={<div className="h-[520px] animate-pulse rounded-3xl bg-white shadow-sm" />}>
                <SiteLoginPanel branding={branding} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
