import { lookup } from 'dns/promises';
import { isIP } from 'net';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data',
]);

export function normalizeUrl(raw: string): string {
  const url = new URL(String(raw || '').trim());
  url.hash = '';
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }
  let pathname = url.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  url.pathname = pathname;
  const tracking = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'];
  for (const key of tracking) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString();
}

export function originOf(raw: string): string {
  return new URL(raw).origin;
}

export function sameDomain(a: string, b: string): boolean {
  try {
    const hostA = new URL(a).hostname.replace(/^www\./, '').toLowerCase();
    const hostB = new URL(b).hostname.replace(/^www\./, '').toLowerCase();
    return hostA === hostB;
  } catch {
    return false;
  }
}

export function isUnsafeProtocol(raw: string): boolean {
  try {
    const protocol = new URL(raw).protocol.toLowerCase();
    return protocol !== 'http:' && protocol !== 'https:';
  } catch {
    return true;
  }
}

export function isPrivateIp(ip: string): boolean {
  const value = ip.toLowerCase().replace(/^::ffff:/, '');
  if (value === '::1' || value === '0.0.0.0') return true;
  if (value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return true;
  const ipv4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '169.254.169.254' || host.endsWith('.metadata.google.internal')) return true;
  if (isIP(host) && isPrivateIp(host)) return true;
  return false;
}

export function assertHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are allowed.');
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error('Internal, localhost, and metadata URLs are blocked.');
  }
  return url;
}

export async function assertPublicHttpUrl(raw: string): Promise<string> {
  const url = assertHttpUrl(raw);
  const host = url.hostname;
  if (isIP(host) && isPrivateIp(host)) {
    throw new Error('Private IP addresses are blocked.');
  }
  try {
    const records = await lookup(host, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        throw new Error('This host resolves to a private or internal address.');
      }
    }
  } catch (error) {
    if (error instanceof Error && /private or internal|blocked/.test(error.message)) throw error;
    throw new Error('The website host could not be resolved.');
  }
  return normalizeUrl(url.toString());
}

export function shouldSkipHref(href: string): boolean {
  const value = String(href || '').trim().toLowerCase();
  if (!value || value.startsWith('#') || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('javascript:')) {
    return true;
  }
  if (/\.(pdf|zip|rar|7z|exe|dmg|iso|mp4|mp3|avi|mov|wmv|docx?|xlsx?|pptx?)(\?|$)/i.test(value)) return true;
  if (/logout|sign-?out|sign_out/i.test(value)) return true;
  return false;
}

export function looksLikeInfiniteList(url: string): boolean {
  try {
    const parsed = new URL(url);
    const keys = [...parsed.searchParams.keys()].map((key) => key.toLowerCase());
    const noisy = ['page', 'p', 'offset', 'cursor', 'date', 'year', 'month', 'day', 'filter', 'sort', 'order', 'sessionid'];
    return keys.filter((key) => noisy.includes(key)).length >= 2 || keys.length > 4;
  } catch {
    return true;
  }
}
