import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/terms-of-service',
    title: 'Terms of Service',
    description:
      'Review TechAntum terms of service for software development projects. Clear terms covering scope, payment, delivery, and support.',
  });
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
