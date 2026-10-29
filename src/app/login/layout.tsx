import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/login',
    title: 'Sign in',
    description: 'Sign in to your Techantum account to manage your dashboard and stay connected with our team.',
    keywords: ['TechAntum login', 'sign in', 'create account'],
    noindex: true,
    nofollow: true,
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
