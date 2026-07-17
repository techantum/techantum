import { headers } from 'next/headers';

/** Current request pathname (set by middleware) for per-page SEO snippets. */
export async function getRequestPathname(): Promise<string> {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname');
  if (!pathname) return '/';
  return pathname === '' ? '/' : pathname;
}
