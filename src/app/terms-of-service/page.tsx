import LegalDocument from '@/components/cms/LegalDocument';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export default function TermsOfServicePage() {
  return <LegalDocument entryKey="legal.terms" icon="ClipboardDocumentCheckIcon" />;
}
