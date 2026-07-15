import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizeRedirectPath } from '@/lib/seo/redirects';

type RedirectRow = {
  source_path: string;
  destination_path: string;
  is_permanent: boolean;
};

let redirectCache: { expires: number; rows: RedirectRow[] } = { expires: 0, rows: [] };

async function fetchRedirects(): Promise<RedirectRow[]> {
  const now = Date.now();
  if (redirectCache.expires > now) return redirectCache.rows;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_redirects?enabled=eq.true&select=source_path,destination_path,is_permanent`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as RedirectRow[];
    redirectCache = { expires: now + 300_000, rows };
    return rows;
  } catch {
    return [];
  }
}

function getCanonicalHost(): 'www' | 'non-www' {
  const pref = process.env.CANONICAL_HOST || process.env.NEXT_PUBLIC_CANONICAL_HOST || 'non-www';
  return pref === 'www' ? 'www' : 'non-www';
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const isProduction = process.env.NODE_ENV === 'production';
  const canonicalHost = getCanonicalHost();

  // Force HTTPS in production
  if (isProduction) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }
  }

  // Canonical www vs non-www
  const isWww = hostname.startsWith('www.');
  const bareHost = isWww ? hostname.slice(4) : hostname;

  if (canonicalHost === 'non-www' && isWww) {
    url.host = bareHost;
    return NextResponse.redirect(url, 301);
  }

  if (canonicalHost === 'www' && !isWww && !hostname.includes('localhost') && !hostname.startsWith('127.')) {
    url.host = `www.${hostname}`;
    return NextResponse.redirect(url, 301);
  }

  // CMS redirect manager
  const pathname = normalizeRedirectPath(url.pathname);
  const redirects = await fetchRedirects();
  const match = redirects.find((r) => normalizeRedirectPath(r.source_path) === pathname);
  if (match) {
    const dest = match.destination_path.startsWith('http')
      ? match.destination_path
      : `${url.origin}${match.destination_path.startsWith('/') ? match.destination_path : `/${match.destination_path}`}`;
    return NextResponse.redirect(dest, match.is_permanent ? 301 : 302);
  }

  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  const isDev = !isProduction;
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https://*.supabase.co blob: data:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-src 'self' https://www.google.com https://pagead2.googlesyndication.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
