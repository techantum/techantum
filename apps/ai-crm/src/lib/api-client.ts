'use client';

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

export function qualTone(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'hot') return 'rose' as const;
  if (s === 'warm') return 'orange' as const;
  if (s === 'cold') return 'sky' as const;
  if (s === 'valid') return 'green' as const;
  if (s === 'invalid') return 'rose' as const;
  if (s.includes('review')) return 'amber' as const;
  return 'slate' as const;
}

export function waTone(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'responded' || s === 'replied') return 'green' as const;
  if (s.includes('sent') || s.includes('delivered')) return 'purple' as const;
  if (s.includes('opt')) return 'rose' as const;
  return 'slate' as const;
}
