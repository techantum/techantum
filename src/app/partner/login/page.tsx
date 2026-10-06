import { Suspense } from 'react';
import { getBranding } from '@/lib/cms';
import PartnerLoginForm from './PartnerLoginForm';

export default async function PartnerLoginPage() {
  const branding = await getBranding();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F3EE]" />
      }
    >
      <PartnerLoginForm siteLogoUrl={branding.logo_url} siteName={branding.company_name} />
    </Suspense>
  );
}
