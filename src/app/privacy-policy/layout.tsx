import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read TechAntum privacy policy. Learn how we collect, use, and protect your personal data in compliance with GDPR.',
  alternates: {
    canonical: '/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | TechAntum',
    description: 'How TechAntum handles and protects your personal data.',
    url: '/privacy-policy',
  },
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
