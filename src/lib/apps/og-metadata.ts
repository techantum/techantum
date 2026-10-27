import { saveUploadedFile } from '@/lib/storage/local';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export function normalizeAppUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('URL is required');
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  return parsed.toString();
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .trim();
}

function collectMeta(html: string) {
  const map = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = (
      tag.match(/(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1] ||
      tag.match(/(?:property|name|itemprop)\s*=\s*([^\s>]+)/i)?.[1] ||
      ''
    ).toLowerCase();
    const value = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] || tag.match(/content\s*=\s*([^\s>]+)/i)?.[1] || '';
    if (key && value && !map.has(key)) map.set(key, decodeEntities(value));
  }
  return map;
}

function jsonLdImages(html: string) {
  const images: string[] = [];
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      const data = JSON.parse(json);
      const walk = (node: unknown) => {
        if (!node) return;
        if (typeof node === 'string' && /^https?:\/\//i.test(node)) images.push(node);
        if (Array.isArray(node)) node.forEach(walk);
        if (typeof node === 'object') {
          const record = node as Record<string, unknown>;
          if (record.image) walk(record.image);
          if (record.logo) walk(record.logo);
          if (record.url && record['@type'] === 'ImageObject') walk(record.url);
        }
      };
      walk(data);
    } catch {
      /* ignore invalid json-ld */
    }
  }
  return images;
}

function resolveUrl(base: string, value?: string | null) {
  if (!value) return null;
  try {
    return new URL(decodeEntities(value), base).toString();
  } catch {
    return null;
  }
}

async function downloadImage(imageUrl: string, referer: string) {
  const res = await fetch(imageUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      Referer: referer,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 80) return null;
  const looksImage =
    type.startsWith('image/') ||
    buffer.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    buffer.slice(0, 8).includes(Buffer.from('PNG')) ||
    buffer.slice(0, 4).toString() === 'RIFF';
  if (!looksImage) return null;
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
  const blob = new Blob([new Uint8Array(buffer)], { type: type.startsWith('image/') ? type : 'image/jpeg' });
  const saved = await saveUploadedFile('apps', `og-${Date.now()}.${ext}`, blob);
  return `/${saved.relativePath}`;
}

export async function fetchOgMetadata(pageUrl: string) {
  try {
    const res = await fetch(pageUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { ogImage: null, ogTitle: null };
    const html = (await res.text()).slice(0, 400_000);
    const base = res.url || pageUrl;
    const meta = collectMeta(html);
    const linkImage =
      html.match(/<link\b[^>]*rel=["']image_src["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)["']/i)?.[1] ||
      html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']image_src["']/i)?.[1];
    const candidates = [
      meta.get('og:image:secure_url'),
      meta.get('og:image'),
      meta.get('og:image:url'),
      meta.get('twitter:image'),
      meta.get('twitter:image:src'),
      meta.get('image'),
      linkImage,
      ...jsonLdImages(html),
    ]
      .map((value) => resolveUrl(base, value))
      .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

    let ogImage: string | null = null;
    for (const candidate of candidates.slice(0, 3)) {
      ogImage = await downloadImage(candidate, base);
      if (ogImage) break;
    }
    if (!ogImage) ogImage = candidates[0] || null;

    const ogTitle =
      meta.get('og:title') ||
      meta.get('twitter:title') ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      null;
    return { ogImage, ogTitle: ogTitle ? decodeEntities(ogTitle) : null };
  } catch {
    return { ogImage: null, ogTitle: null };
  }
}
