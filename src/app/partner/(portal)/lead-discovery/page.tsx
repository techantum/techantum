'use client';

import LeadDiscoveryPage from '@/app/admin/(dashboard)/lead-discovery/page';
import { LeadDiscoveryPathsContext } from '@/components/lead-discovery/LeadDiscoveryPaths';

const PATHS = {
  apiBase: '/api/admin/lead-discovery',
  pageBase: '/partner/lead-discovery',
};

export default function PartnerLeadDiscoveryPage() {
  return (
    <LeadDiscoveryPathsContext.Provider value={PATHS}>
      <LeadDiscoveryPage />
    </LeadDiscoveryPathsContext.Provider>
  );
}
