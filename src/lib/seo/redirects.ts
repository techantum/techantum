import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SiteRedirect {
  id: string;
  source_path: string;
  destination_path: string;
  is_permanent: boolean;
  enabled: boolean;
  note: string | null;
}

export const getActiveRedirects = cache(async (): Promise<SiteRedirect[]> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_redirects')
      .select('*')
      .eq('enabled', true)
      .order('source_path');

    return (data as SiteRedirect[]) ?? [];
  } catch {
    return [];
  }
});

export function normalizeRedirectPath(path: string): string {
  if (!path) return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

export function findRedirect(
  pathname: string,
  redirects: SiteRedirect[]
): SiteRedirect | undefined {
  const normalized = normalizeRedirectPath(pathname);
  return redirects.find((r) => normalizeRedirectPath(r.source_path) === normalized);
}
