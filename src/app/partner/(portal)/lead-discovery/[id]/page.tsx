'use client';

import LeadDiscoveryDetailsPage from '@/app/admin/(dashboard)/lead-discovery/[id]/page';
import { LeadDiscoveryPathsContext } from '@/components/lead-discovery/LeadDiscoveryPaths';

const PATHS = {
  apiBase: '/api/admin/lead-discovery',
  pageBase: '/partner/lead-discovery',
};

export default function PartnerLeadDiscoveryDetailsPage() {
  return (
    <LeadDiscoveryPathsContext.Provider value={PATHS}>
      <LeadDiscoveryDetailsPage />
    </LeadDiscoveryPathsContext.Provider>
  );
}
