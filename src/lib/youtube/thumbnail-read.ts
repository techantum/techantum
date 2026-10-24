import { buildProviderChain, getGatewayConfig } from '../ai/config';
import { extractJsonText } from '../ai/json';
import { q } from '../finance/db';
import type { ResolvedProvider } from '../ai/types';
import { createYoutube } from './client';
import { lengthLabel } from './parse';
import { readApiKey } from './service';

export type ThumbnailReading = { text: string; scene: string };

const IMAGE_HOST = /^https:\/\/(i\.ytimg\.com|i[0-9]*\.ytimg\.com|img\.youtube\.com|yt3\.ggpht\.com|yt3\.googleusercontent\.com|ytimg\.l\.googleusercontent\.com)\//i;
const AUDIENCE_CLAIM = /watch hours|viewer percentage|ages? watched|genders? watched|demographic/i;

export function thumbnailSources(videoId: string | null | undefined, stored: string | null | undefined) {
  const urls: string[] = [];
  const id = String(videoId || '');
  if (/^[\w-]{11}$/.test(id)) {
    urls.push(
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    );
  }
  if (stored && IMAGE_HOST.test(stored)) urls.push(stored);
  return [...new Set(urls)];
}

export function parseThumbnailReading(raw: string): ThumbnailReading {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(extractJsonText(raw) || '{}');
  } catch {
    parsed = {};
  }
  const clean = (value: unknown, max: number) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const text = clean(parsed.text || parsed.words, 300);
  const scene = clean(parsed.scene || parsed.description, 240);
  return {
    text: AUDIENCE_CLAIM.test(text) ? '' : text,
    scene: AUDIENCE_CLAIM.test(scene) ? '' : scene,
  };
}

export function imageMimeFromBytes(bytes: Buffer, headerMime?: string | null) {
  const header = String(headerMime || '').split(';')[0].trim().toLowerCase();
  if (header === 'image/jpg') return 'image/jpeg';
  if (/^image\/(jpeg|png|webp)$/.test(header)) return header;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes.length >= 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return '';
}

async function downloadThumbnail(urls: string[]) {
  let best: { url: string; bytes: Buffer; mime: string } | null = null;
  for (const url of urls) {
    if (!IMAGE_HOST.test(url)) continue;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 2000 || bytes.length > 4_000_000) continue;
      const mime = imageMimeFromBytes(bytes, response.headers.get('content-type'));
      if (!mime) continue;
      if (!best || bytes.length > best.bytes.length) best = { url, bytes, mime };
    } catch {
      /* try the next size */
    }
  }
  return best;
}

function visionProvider(provider: ResolvedProvider): ResolvedProvider {
  if (provider.id === 'openai' && !/(gpt-4o|gpt-4\.1|gpt-5|o4-|vision|4-turbo)/i.test(provider.model)) {
    return { ...provider, model: 'gpt-4o-mini' };
  }
  return provider;
}

const PROMPT = `Read this YouTube thumbnail image. Return JSON only:
{"text":"exact words visible on the image, or an empty string","scene":"one sentence describing what the picture shows"}
Copy only words you can see. Do not invent viewer age, gender, country, watch hours, or a title that is not printed on the image.`;

async function askGemini(provider: ResolvedProvider, image: { bytes: Buffer; mime: string }, data: string, timeout: AbortSignal) {
  const parts = [
    [{ text: PROMPT }, { inline_data: { mime_type: image.mime, data } }],
    [{ text: PROMPT }, { inlineData: { mimeType: image.mime, data } }],
  ];
  let last = 'Gemini could not read the thumbnail';
  for (const contentParts of parts) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: timeout,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: contentParts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400, responseMimeType: 'application/json' },
        }),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      last = body?.error?.message || last;
      continue;
    }
    return body?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
  }
  throw new Error(last);
}

async function askProvider(provider: ResolvedProvider, image: { bytes: Buffer; mime: string }) {
  const used = visionProvider(provider);
  const data = image.bytes.toString('base64');
  const timeout = AbortSignal.timeout(20000);
  if (used.id === 'gemini') return askGemini(used, image, data, timeout);
  if (used.id === 'openai') {
    const headers: Record<string, string> = { Authorization: `Bearer ${used.apiKey}`, 'Content-Type': 'application/json' };
    if (used.organizationId) headers['OpenAI-Organization'] = used.organizationId;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      signal: timeout,
      body: JSON.stringify({
        model: used.model,
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${image.mime};base64,${data}` } },
          ],
        }],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || 'OpenAI could not read the thumbnail');
    return body?.choices?.[0]?.message?.content || '';
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': used.apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: timeout,
    body: JSON.stringify({
      model: used.model,
      max_tokens: 400,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mime, data } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || 'Claude could not read the thumbnail');
  return (body?.content || []).map((part: { text?: string }) => part.text || '').join('');
}

async function readImage(image: { bytes: Buffer; mime: string }) {
  const chain = buildProviderChain(await getGatewayConfig());
  let last = '';
  for (const provider of chain) {
    try {
      const raw = await askProvider(provider, image);
      const reading = parseThumbnailReading(raw);
      if (reading.text || reading.scene) return reading;
    } catch (error) {
      last = error instanceof Error ? error.message : 'Thumbnail reading failed';
    }
  }
  if (last) console.warn('[youtube thumbnail]', last);
  return { text: '', scene: '' };
}

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

type MediaVideo = {
  id?: string;
  youtube_video_id?: string | null;
  duration?: string | null;
  duration_seconds?: number | null;
  duration_label?: string | null;
  thumbnail_url?: string | null;
  thumbnail_text?: string | null;
  thumbnail_scene?: string | null;
  thumbnail_caption?: string | null;
  thumbnail_checked?: boolean | null;
};

type StoredVideo = {
  id: string;
  youtube_video_id: string | null;
  duration: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  thumbnail_text?: string | null;
  thumbnail_scene?: string | null;
};

async function persistReading(projectId: string | undefined, videoId: string, reading: ThumbnailReading) {
  const caption = [reading.text, reading.scene].filter(Boolean).join(' · ');
  if (!caption) return;
  await q(
    undefined,
    `UPDATE youtube_videos SET thumbnail_text=$2, thumbnail_scene=$3 WHERE id=$1`,
    [videoId, reading.text || null, reading.scene || null],
  ).catch(() => undefined);
  if (!projectId) return;
  await q(
    undefined,
    `INSERT INTO youtube_project_video_research (project_id, video_id, thumbnail_caption)
     VALUES ($1,$2,$3)
     ON CONFLICT (project_id, video_id) DO UPDATE SET
       thumbnail_caption = COALESCE(NULLIF(youtube_project_video_research.thumbnail_caption, ''), EXCLUDED.thumbnail_caption),
       updated_at = NOW()`,
    [projectId, videoId, caption],
  ).catch(() => undefined);
}

export async function enrichComparisonVideos<T extends MediaVideo>(videos: T[], projectId?: string) {
  const list = videos.filter((video) => video?.id);
  if (!list.length) return videos;
  const ids = list.map((video) => String(video.id));
  const stored = await q<StoredVideo>(
    undefined,
    `SELECT id, youtube_video_id, duration, duration_seconds, thumbnail_url, thumbnail_text, thumbnail_scene FROM youtube_videos WHERE id = ANY($1::uuid[])`,
    [ids],
  ).catch(async () => q<StoredVideo>(
    undefined,
    `SELECT id, youtube_video_id, duration, duration_seconds, thumbnail_url FROM youtube_videos WHERE id = ANY($1::uuid[])`,
    [ids],
  )).catch(() => ({ rows: [] as StoredVideo[] }));
  const byId = new Map(stored.rows.map((row) => [row.id, row]));
  const missingIds = list
    .map((video) => byId.get(String(video.id)) || video)
    .filter((video) => !lengthLabel(video) && video.youtube_video_id)
    .map((video) => String(video.youtube_video_id));
  if (missingIds.length) {
    try {
      const fresh = await createYoutube(await readApiKey()).videos([...new Set(missingIds)]);
      for (const item of fresh) {
        for (const video of list) {
          const row = byId.get(String(video.id));
          const youtubeId = row?.youtube_video_id || video.youtube_video_id;
          if (youtubeId !== item.youtubeVideoId) continue;
          if (row) {
            row.duration = item.duration || row.duration;
            row.thumbnail_url = item.thumbnailUrl || row.thumbnail_url;
          }
          video.duration = item.duration || video.duration;
          video.thumbnail_url = item.thumbnailUrl || video.thumbnail_url;
        }
      }
    } catch {
      /* length stays blank when YouTube cannot be reached */
    }
  }
  return mapPool(list, 3, async (video) => {
    const row = byId.get(String(video.id));
    const duration = video.duration || row?.duration || null;
    const durationSeconds = video.duration_seconds ?? row?.duration_seconds ?? null;
    const youtubeId = video.youtube_video_id || row?.youtube_video_id || null;
    const storedThumb = video.thumbnail_url || row?.thumbnail_url || null;
    const storedText = String(video.thumbnail_text || row?.thumbnail_text || '').trim();
    const storedScene = String(video.thumbnail_scene || row?.thumbnail_scene || '').trim();
    const next = {
      ...video,
      youtube_video_id: youtubeId,
      duration,
      duration_seconds: durationSeconds,
      duration_label: lengthLabel({ duration_label: video.duration_label, duration_seconds: durationSeconds, duration }) || null,
      thumbnail_url: thumbnailSources(youtubeId, storedThumb)[0] || storedThumb,
      thumbnail_text: storedText || null,
      thumbnail_scene: storedScene || null,
    };
    if (video.thumbnail_checked || storedText || storedScene) return next;
    const image = await downloadThumbnail(thumbnailSources(youtubeId, storedThumb));
    if (!image) return { ...next, thumbnail_checked: true };
    const reading = await readImage(image);
    if (reading.text || reading.scene) await persistReading(projectId, String(video.id), reading);
    return {
      ...next,
      thumbnail_url: image.url,
      thumbnail_text: reading.text || null,
      thumbnail_scene: reading.scene || null,
      thumbnail_caption: video.thumbnail_caption || [reading.text, reading.scene].filter(Boolean).join(' · ') || null,
      thumbnail_checked: true,
    };
  });
}

export async function loadThumbnailFile(video: MediaVideo) {
  return downloadThumbnail(thumbnailSources(video.youtube_video_id, video.thumbnail_url));
}
