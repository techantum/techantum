const OWNED_HOSTS = new Set([
  'techantum.com',
  'www.techantum.com',
  'localhost',
  '127.0.0.1',
]);

export function allowedAuditUrl(raw: string, siteOrigin?: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (OWNED_HOSTS.has(host)) return true;
    if (siteOrigin) {
      const originHost = new URL(siteOrigin).hostname.toLowerCase();
      if (host === originHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function assertOwnedUrl(raw: string, siteOrigin?: string) {
  if (!allowedAuditUrl(raw, siteOrigin)) {
    throw new Error('Audit fetching is limited to Techantum-owned domains.');
  }
}
