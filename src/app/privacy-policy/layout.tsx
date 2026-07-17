import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/privacy-policy',
    title: 'Privacy Policy',
    description:
      'Read TechAntum privacy policy. Learn how we collect, use, and protect your personal data in compliance with GDPR.',
  });
}

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
