'use client';

import { createContext, useContext } from 'react';

export type LeadDiscoveryPaths = {
  apiBase: string;
  pageBase: string;
};

const DEFAULT_PATHS: LeadDiscoveryPaths = {
  apiBase: '/api/leads',
  pageBase: '/leads',
};

export const LeadDiscoveryPathsContext = createContext<LeadDiscoveryPaths>(DEFAULT_PATHS);

export function useLeadDiscoveryPaths() {
  return useContext(LeadDiscoveryPathsContext);
}
