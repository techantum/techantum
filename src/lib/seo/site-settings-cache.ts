type CanonicalHost = 'www' | 'non-www';

let seoSettingsCache: { expires: number; canonicalHost: CanonicalHost } = {
  expires: 0,
  canonicalHost: 'non-www',
};

/** Cached CMS canonical host preference for middleware redirects. */
export async function fetchCanonicalHostPreference(): Promise<CanonicalHost> {
  const now = Date.now();
  if (seoSettingsCache.expires > now) return seoSettingsCache.canonicalHost;

  const envPref = process.env.CANONICAL_HOST || process.env.NEXT_PUBLIC_CANONICAL_HOST;
  let canonicalHost: CanonicalHost = envPref === 'www' ? 'www' : 'non-www';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/site_seo?id=eq.1&select=canonical_host`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          next: { revalidate: 300 },
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as { canonical_host?: string | null }[];
        const pref = rows[0]?.canonical_host;
        if (pref === 'www' || pref === 'non-www') {
          canonicalHost = pref;
        }
      }
    } catch {
      /* keep env/default fallback */
    }
  }

  seoSettingsCache = { expires: now + 300_000, canonicalHost };
  return canonicalHost;
}
