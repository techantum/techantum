import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/login',
    title: 'Sign in',
    description: 'Login with Google, Facebook, or WhatsApp.',
    keywords: ['TechAntum login', 'Sign in', 'Google', 'Facebook', 'WhatsApp OTP'],
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
