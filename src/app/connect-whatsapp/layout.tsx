import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/login',
    title: 'Sign in',
    description: 'Sign in to TechAntum with Google, Facebook, or a WhatsApp OTP.',
    keywords: ['TechAntum login', 'Sign in'],
  });
}

export default function ConnectWhatsAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
