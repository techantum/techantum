import type { Metadata } from 'next';
import LegalPage from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Hookooh collects, uses, and protects your information.',
};

export default function PrivacyPolicyPage() {
  return <LegalPage sectionKey="privacy" />;
}
