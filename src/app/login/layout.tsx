import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/login',
    title: 'Client portal sign in',
    description:
      'Sign in to your Techantum WhatsApp Business API portal to manage numbers, templates, messages, and analytics.',
    keywords: ['TechAntum login', 'WhatsApp Business API portal', 'Google sign in', 'WhatsApp OTP'],
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
