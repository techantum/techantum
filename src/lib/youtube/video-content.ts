function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTimedText(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as { events?: { segs?: { utf8?: string }[] }[] };
      return (parsed.events || [])
        .map((event) => (event.segs || []).map((seg) => seg.utf8 || '').join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return '';
    }
  }
  const chunks = [...text.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)].map((match) => decodeXml(match[1]));
  if (chunks.length) return chunks.join(' ').replace(/\s+/g, ' ').trim();
  return decodeXml(text);
}

export function clipSpokenText(value: string, max = 8000) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

async function captionUrlFromPlayer(videoId: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: '2.20240401.00.00', hl: 'en' } },
      videoId,
    }),
  });
  if (!response.ok) return '';
  const body = await response.json().catch(() => ({}));
  const tracks = body?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || !tracks.length) return '';
  const preferred = tracks.find((track: { languageCode?: string }) => String(track.languageCode || '').startsWith('en')) || tracks[0];
  return String(preferred?.baseUrl || '');
}

export async function fetchPublicCaptions(videoId: string, fetchImpl: typeof fetch = fetch) {
  const id = String(videoId || '');
  if (!/^[\w-]{11}$/.test(id)) return '';
  try {
    const trackUrl = await captionUrlFromPlayer(id, fetchImpl);
    if (!trackUrl || !/^https:\/\/www\.youtube\.com\//i.test(trackUrl)) return '';
    const url = trackUrl.includes('fmt=') ? trackUrl : `${trackUrl}${trackUrl.includes('?') ? '&' : '?'}fmt=json3`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return '';
    return clipSpokenText(parseTimedText(await response.text()));
  } catch {
    return '';
  }
}

type ContentVideo = {
  youtube_video_id?: string | null;
  description?: string | null;
  spoken_text?: string | null;
  spoken_source?: 'captions' | 'description' | null;
};

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function enrichSpokenContent<T extends ContentVideo>(videos: T[], fetchImpl?: typeof fetch) {
  return mapPool(videos, 2, async (video) => {
    if (String(video.spoken_text || '').trim()) return video;
    const captions = video.youtube_video_id ? await fetchPublicCaptions(video.youtube_video_id, fetchImpl || fetch) : '';
    if (captions) return { ...video, spoken_text: captions, spoken_source: 'captions' as const };
    const description = String(video.description || '').trim();
    if (description) return { ...video, spoken_text: clipSpokenText(description, 2500), spoken_source: 'description' as const };
    return { ...video, spoken_text: null, spoken_source: null };
  });
}
