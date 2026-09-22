import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/login',
    title: 'Sign in',
    description:
      'Sign in to TechAntum with Google, Facebook, or a WhatsApp OTP. Access your workspace, WhatsApp Business portal, and project updates.',
    keywords: ['TechAntum login', 'Sign in', 'Google', 'Facebook', 'WhatsApp OTP'],
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
