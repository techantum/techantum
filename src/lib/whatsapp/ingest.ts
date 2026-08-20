import dns from 'node:dns/promises';
import net from 'node:net';

export const MAX_KNOWLEDGE_CHUNK = 7000;
export const MAX_INGEST_URLS = 10;
export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const MAX_REMOTE_BYTES = 15 * 1024 * 1024;

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google',
]);

export function parseUrlList(value: string): string[] {
  const seen = new Set<string>();
  for (const part of value.split(/[\n,]+/)) {
    const item = part.trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
  }
  return [...seen];
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCharCode(Number(num)));
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

export function extractHtmlDocument(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? decodeHtmlEntities(stripTags(titleMatch[1])).replace(/\s+/g, ' ').trim() || null
    : null;

  let body = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  body = body.replace(/<\/(p|div|h[1-6]|li|tr|section|article|header|footer|blockquote|td|th)>/gi, '\n\n');
  body = body.replace(/<br\s*\/?>/gi, '\n');
  body = body.replace(/<\/?(ul|ol|table)>/gi, '\n');

  const text = decodeHtmlEntities(stripTags(body))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return { title, text };
}

function splitLongPiece(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        parts.push(current.trim());
        current = '';
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        parts.push(sentence.slice(i, i + maxChars).trim());
      }
      continue;
    }
    if (!current) {
      current = sentence;
      continue;
    }
    if (`${current} ${sentence}`.length <= maxChars) {
      current = `${current} ${sentence}`;
    } else {
      parts.push(current.trim());
      current = sentence;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

export function chunkText(text: string, maxChars = MAX_KNOWLEDGE_CHUNK): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  let current = '';
  for (const raw of cleaned.split(/\n\s*\n/)) {
    const piece = raw.trim();
    if (!piece) continue;
    if (piece.length > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      chunks.push(...splitLongPiece(piece, maxChars));
      continue;
    }
    if (!current) {
      current = piece;
      continue;
    }
    if (`${current}\n\n${piece}`.length <= maxChars) {
      current = `${current}\n\n${piece}`;
    } else {
      chunks.push(current.trim());
      current = piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function buildChunkTitle(baseTitle: string, index: number, total: number): string {
  const title = baseTitle.trim() || 'Imported knowledge';
  if (total <= 1) return title.slice(0, 180);
  return `${title.slice(0, 150)} (part ${index + 1} of ${total})`;
}

export function isPrivateIp(ip: string): boolean {
  const mapped = ip.toLowerCase().startsWith('::ffff:') ? ip.slice(7) : ip;
  if (net.isIPv4(mapped)) {
    const [a, b] = mapped.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    const first = parseInt(normalized.split(':')[0] || '0', 16);
    if ((first & 0xfe00) === 0xfc00) return true;
    if ((first & 0xffc0) === 0xfe80) return true;
    return false;
  }
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (net.isIP(host) && isPrivateIp(host)) return true;
  return false;
}

export function parseAndCheckUrlShape(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('Enter a valid website URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed.');
  }
  if (url.username || url.password) {
    throw new Error('URLs with login details are not allowed.');
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error('That URL cannot be used for training.');
  }
  return url;
}

export async function assertSafeHttpUrl(raw: string): Promise<URL> {
  const url = parseAndCheckUrlShape(raw);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return url;
  const results = await dns.lookup(host, { all: true });
  if (results.length === 0) throw new Error('Could not resolve that website.');
  for (const result of results) {
    if (isPrivateIp(result.address)) {
      throw new Error('That URL cannot be used for training.');
    }
  }
  return url;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > maxBytes) throw new Error('That file is too large to import.');
    return buf;
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('That file is too large to import.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function extractPdfText(data: Uint8Array): Promise<{ title: string | null; text: string }> {
  const unpdf = await import('unpdf');
  const [textResult, metaResult] = await Promise.all([
    unpdf.extractText(data, { mergePages: true }),
    unpdf.getMeta(data).catch(() => null),
  ]);
  const text = (typeof textResult.text === 'string' ? textResult.text : textResult.text.join('\n\n'))
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const info = metaResult?.info as { Title?: string } | undefined;
  const title = typeof info?.Title === 'string' ? info.Title.trim() || null : null;
  return { title, text };
}

export type RemoteSource = {
  kind: 'HTML' | 'PDF';
  finalUrl: string;
  title: string | null;
  text: string;
};

export async function fetchRemoteSource(rawUrl: string): Promise<RemoteSource> {
  let current = await assertSafeHttpUrl(rawUrl);
  let response: Response | null = null;

  for (let hop = 0; hop < 5; hop += 1) {
    response = await fetch(current.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: 'text/html,application/pdf,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'TechantumKnowledgeBot/1.0 (+https://techantum.com)',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('That website redirected to an invalid location.');
      current = await assertSafeHttpUrl(new URL(location, current).toString());
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    throw new Error(`Could not fetch that website (${response?.status || 'no response'}).`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const buffer = await readLimitedBody(response, MAX_REMOTE_BYTES);
  const looksPdf =
    contentType.includes('application/pdf') ||
    current.pathname.toLowerCase().endsWith('.pdf') ||
    buffer.subarray(0, 4).toString('utf8') === '%PDF';

  if (looksPdf) {
    const extracted = await extractPdfText(new Uint8Array(buffer));
    if (extracted.text.length < 40) {
      throw new Error('No readable text was found in that PDF. Scanned image PDFs are not supported yet.');
    }
    return { kind: 'PDF', finalUrl: current.toString(), title: extracted.title, text: extracted.text };
  }

  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
    throw new Error('That URL is not a webpage or PDF.');
  }

  const extracted = extractHtmlDocument(buffer.toString('utf8'));
  if (extracted.text.length < 40) {
    throw new Error('No readable text was found on that page.');
  }
  return { kind: 'HTML', finalUrl: current.toString(), title: extracted.title, text: extracted.text };
}

export function sourceKeywords(input: { title?: string; url?: string | null; extra?: string }): string {
  const parts = new Set<string>();
  for (const token of (input.extra || '').split(/[,\s]+/)) {
    if (token.trim()) parts.add(token.trim());
  }
  if (input.title) {
    for (const token of input.title.toLowerCase().split(/\s+/).filter((t) => t.length > 2).slice(0, 8)) {
      parts.add(token);
    }
  }
  if (input.url) {
    try {
      parts.add(new URL(input.url).hostname.replace(/^www\./, ''));
    } catch {
      /* ignore */
    }
  }
  return [...parts].join(', ');
}
