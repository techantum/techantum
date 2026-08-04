import { readFile } from 'fs/promises';
import path from 'path';
import { getBranding } from '@/lib/cms';
import { defaultBranding } from '@/lib/cms/default-content';
import { getUploadRoot } from '@/lib/storage/local';

export async function getFaviconUrl(): Promise<string | null> {
  try {
    const branding = await getBranding();
    return branding.favicon_url || defaultBranding.favicon_url;
  } catch {
    return null;
  }
}

async function readLocalFile(urlPath: string): Promise<Response | null> {
  if (!urlPath.startsWith('/uploads/')) return null;

  const relative = urlPath.replace(/^\/uploads\/?/, '');
  const roots = [
    path.join(process.cwd(), 'public', 'uploads', relative),
    path.join(getUploadRoot(), relative),
  ];

  for (const filePath of roots) {
    try {
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.ico'
            ? 'image/x-icon'
            : ext === '.png'
              ? 'image/png'
              : 'application/octet-stream';
      return new Response(buffer, {
        headers: {
          'Content-Type': type,
          'Cache-Control': 'public, max-age=300, must-revalidate',
        },
      });
    } catch {
      /* try next path */
    }
  }
  return null;
}

async function readLocalFallback(): Promise<Response> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'logo.svg');
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300, must-revalidate',
      },
    });
  } catch {
    return new Response('', { status: 404 });
  }
}

export async function fetchFaviconResponse(): Promise<Response> {
  try {
    const faviconUrl = await getFaviconUrl();

    if (faviconUrl?.startsWith('/uploads/')) {
      const local = await readLocalFile(faviconUrl);
      if (local) return local;
    }

    if (faviconUrl?.startsWith('http://') || faviconUrl?.startsWith('https://')) {
      const res = await fetch(faviconUrl, { cache: 'no-store' });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=300, must-revalidate',
          },
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch CMS favicon:', err);
  }

  return readLocalFallback();
}
