import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Review TechAntum terms of service for software development projects. Clear terms covering scope, payment, delivery, and support.',
  alternates: {
    canonical: '/terms-of-service',
  },
  openGraph: {
    title: 'Terms of Service | TechAntum',
    description: 'Terms and conditions for TechAntum development services.',
    url: '/terms-of-service',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
