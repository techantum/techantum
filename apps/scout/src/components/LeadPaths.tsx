'use client';

import { LeadDiscoveryPathsContext } from '@/components/lead-discovery/LeadDiscoveryPaths';

const PATHS = { apiBase: '/api/leads', pageBase: '/leads' };

export default function LeadPaths({ children }: { children: React.ReactNode }) {
  return <LeadDiscoveryPathsContext.Provider value={PATHS}>{children}</LeadDiscoveryPathsContext.Provider>;
}
