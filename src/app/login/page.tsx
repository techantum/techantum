import { Suspense } from 'react';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PageHeroSection from '@/components/common/PageHeroSection';
import SiteLoginPanel from '@/components/auth/SiteLoginPanel';
import Icon from '@/components/ui/AppIcon';

export const dynamic = 'force-dynamic';

const BENEFITS = [
  {
    icon: 'ShieldCheckIcon',
    title: 'A secure business workspace',
    body: 'Your enquiries, WhatsApp setup, and project updates live in one signed-in account instead of scattered chats and emails.',
  },
  {
    icon: 'ChatBubbleLeftRightIcon',
    title: 'WhatsApp Business in one place',
    body: 'After you sign in, connect your WhatsApp Business account and manage numbers, templates, and conversations from your portal.',
  },
  {
    icon: 'ClockIcon',
    title: 'Faster follow-ups',
    body: 'Signed-in users get a saved workspace, so TechAntum can pick up quotes, appointments, and support without starting from scratch.',
  },
  {
    icon: 'ChartBarIcon',
    title: 'Clearer progress',
    body: 'See delivery, campaign, and onboarding status instead of waiting for a status email every time something changes.',
  },
  {
    icon: 'DevicePhoneMobileIcon',
    title: 'Sign in the way you already use',
    body: 'Google, Facebook, or a WhatsApp OTP. No new password to remember, and no Facebook login for the website itself beyond Sign in.',
  },
  {
    icon: 'UserGroupIcon',
    title: 'Built for growing teams',
    body: 'Invite your team later, keep client data isolated, and only share what your organisation should see.',
  },
];

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PageHeroSection
          eyebrow="Your TechAntum account"
          title="Sign in to get more from TechAntum"
          description="Keep your workspace, WhatsApp Business setup, and project conversations in one place. Sign in with Google, Facebook, or a code on WhatsApp."
        />

        <section className="page-section">
          <div className="page-container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                <h2 className="font-bricolage font-semibold text-lg text-slate-900 mb-2">Why sign in?</h2>
                <p className="text-sm text-slate-600">
                  A TechAntum login is how we recognise you across the website, client portal, and WhatsApp services. Without it, every enquiry is a one-off message. With it, you get continuity, privacy, and a workspace that grows with your business.
                </p>
              </div>
              {BENEFITS.map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={20} />
                  </div>
                  <div>
                    <h3 className="font-bricolage font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-7">
              <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white h-80 animate-pulse" />}>
                <SiteLoginPanel />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
