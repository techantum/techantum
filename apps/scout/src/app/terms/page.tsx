import type { Metadata } from 'next';
import LegalPage from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms for using Hookooh, including trials, subscriptions, and research tools.',
};

export default function TermsPage() {
  return <LegalPage sectionKey="terms" />;
}
