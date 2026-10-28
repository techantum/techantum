export type ChannelRef =
  | { ok: true; kind: 'id' | 'handle' | 'username'; value: string }
  | { ok: false; error: string };

const CHANNEL_ID = /^UC[\w-]{20,32}$/;
const HANDLE = /^[\w.-]{3,60}$/;

export function parseChannelInput(raw: string): ChannelRef {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, error: 'Enter a channel URL, @handle, or channel ID.' };
  if (CHANNEL_ID.test(text)) return { ok: true, kind: 'id', value: text };
  if (text.startsWith('@')) {
    const handle = text.slice(1);
    if (!HANDLE.test(handle)) return { ok: false, error: 'That @handle is not valid.' };
    return { ok: true, kind: 'handle', value: handle };
  }
  if (!/^https?:\/\//i.test(text) && !text.includes('youtube.com') && !text.includes('youtu.be')) {
    if (!HANDLE.test(text)) return { ok: false, error: 'Enter a channel URL, @handle, or channel ID.' };
    return { ok: true, kind: 'handle', value: text };
  }
  let url: URL;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return { ok: false, error: 'That channel link could not be read.' };
  }
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be') {
    return { ok: false, error: 'That is a video link. Paste the channel URL, @handle, or channel ID.' };
  }
  if (host !== 'youtube.com') {
    return { ok: false, error: 'Use a youtube.com channel link, @handle, or channel ID.' };
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const head = parts[0] || '';
  if (head === 'channel' && CHANNEL_ID.test(parts[1] || '')) return { ok: true, kind: 'id', value: parts[1] };
  if (head.startsWith('@')) {
    const handle = decodeURIComponent(head.slice(1));
    if (!HANDLE.test(handle)) return { ok: false, error: 'That @handle is not valid.' };
    return { ok: true, kind: 'handle', value: handle };
  }
  if (head === 'user' && parts[1]) return { ok: true, kind: 'username', value: decodeURIComponent(parts[1]) };
  if (head === 'c' || head === 'watch' || head === 'playlist' || head === 'shorts') {
    return { ok: false, error: 'Paste the @handle or channel ID. This link format cannot be resolved reliably.' };
  }
  return { ok: false, error: 'Paste the @handle or channel ID. This link format cannot be resolved reliably.' };
}

export function parseYoutubeVideoIds(raw: string) {
  const text = String(raw || '');
  const found: string[] = [];
  const seen = new Set<string>();
  const take = (id: string) => {
    if (!/^[\w-]{11}$/.test(id) || seen.has(id)) return;
    seen.add(id);
    found.push(id);
  };
  const url = /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube\.com\/live\/)([\w-]{11})/gi;
  let match: RegExpExecArray | null;
  while ((match = url.exec(text))) take(match[1]);
  return found;
}

export function watchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function channelPublicUrl(channelId: string) {
  return `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;
}

export const YOUTUBE_CATEGORIES: Record<string, string> = {
  '1': 'Film & Animation',
  '2': 'Autos & Vehicles',
  '10': 'Music',
  '15': 'Pets & Animals',
  '17': 'Sports',
  '19': 'Travel & Events',
  '20': 'Gaming',
  '22': 'People & Blogs',
  '23': 'Comedy',
  '24': 'Entertainment',
  '25': 'News & Politics',
  '26': 'Howto & Style',
  '27': 'Education',
  '28': 'Science & Technology',
  '29': 'Nonprofits & Activism',
};

export function categoryLabel(id: unknown) {
  const key = String(id || '');
  if (!key) return null;
  return YOUTUBE_CATEGORIES[key] || `Category ${key}`;
}

export const SHORT_MAX_SECONDS = 180;

export function shortsPlaylistId(channelId: string | null | undefined) {
  const id = String(channelId || '');
  if (!CHANNEL_ID.test(id)) return null;
  return `UUSH${id.slice(2)}`;
}

const PAID_TAGS = new Set(['ad', '#ad', 'sponsored', '#sponsored', 'paidpromotion', 'paid promotion']);

export function isPaidPlacement(input: {
  hasPaidProductPlacement?: boolean | null;
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
}) {
  if (input.hasPaidProductPlacement === true) return true;
  if ((input.tags || []).some((tag) => PAID_TAGS.has(String(tag).trim().toLowerCase()))) return true;
  const text = `${input.title || ''} ${input.description || ''}`.toLowerCase();
  return /#ad\b|#sponsored\b|includes paid promotion|paid promotion/.test(text);
}

export function isShort(input: { durationSeconds?: number | null; title?: string | null; tags?: string[] | null }) {
  const seconds = input.durationSeconds;
  if (seconds != null && Number.isFinite(seconds) && seconds <= SHORT_MAX_SECONDS) return true;
  if (String(input.title || '').toLowerCase().includes('#shorts')) return true;
  return (input.tags || []).some((tag) => /^#?shorts$/i.test(String(tag).trim()));
}

export function durationSeconds(iso: string | null | undefined) {
  if (!iso) return null;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

export function contentLabel(seconds: number | null | undefined, title?: string | null, tags?: string[] | null) {
  if (isShort({ durationSeconds: seconds, title, tags })) return 'Short';
  if (seconds == null && !title && !tags?.length) return null;
  return 'Video';
}

export function formatDuration(iso: string | null | undefined) {
  if (!iso) return '—';
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return iso;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function savedThumbnailUrl(file?: string | null) {
  const clean = String(file || '').replace(/^\/+/, '').replace(/^uploads\//, '');
  if (!clean.startsWith('youtube-thumbnails/')) return null;
  return `/uploads/${clean}`;
}

export function youtubeThumbUrl(youtubeVideoId?: string | null, stored?: string | null) {
  const storedUrl = String(stored || '').trim();
  if (storedUrl && (storedUrl.startsWith('/') || /^https?:\/\//i.test(storedUrl))) return storedUrl;
  const id = String(youtubeVideoId || '');
  if (/^[\w-]{11}$/.test(id)) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return '';
}

export function lengthLabel(input: {
  duration_label?: string | null;
  duration_seconds?: number | null;
  duration?: string | null;
}) {
  const saved = String(input.duration_label || '').trim();
  if (saved && saved !== '—') return saved;
  const seconds = input.duration_seconds == null ? null : Number(input.duration_seconds);
  if (seconds != null && Number.isFinite(seconds) && seconds >= 0) {
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }
  const iso = formatDuration(input.duration);
  return iso === '—' ? '' : iso;
}

export function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function publishingBuckets(dates: (string | null | undefined)[]) {
  const map = new Map<string, number>();
  for (const date of dates) {
    if (!date) continue;
    const key = String(date).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
}

export const YOUTUBE_METRIC_NOTICE =
  'These figures are public values retrieved from the YouTube Data API for items saved in this workspace. They are not YouTube Analytics. Engagement rate is not calculated. Retrieved YouTube details are hidden after 30 days until you refresh them.';

export const WATCH_HOURS_NOTE =
  'Watch hours are not returned by the YouTube Data API. Title, content on the thumbnail, organic or paid placement, and public viewership are.';

export function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  const text = value.trim();
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parseTags(parsed);
    } catch {
      /* continue */
    }
  }
  if (text.startsWith('{') && text.endsWith('}')) {
    return parseTags(text.slice(1, -1).split(',').map((item) => item.replace(/^"+|"+$/g, '').trim()));
  }
  return [...new Set(text.split(/[,|]/).map((item) => item.trim()).filter(Boolean))];
}
