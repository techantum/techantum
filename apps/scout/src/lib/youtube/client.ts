import { parseChannelInput } from './parse';

export type YoutubeFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type YoutubeErrorCode = 'invalid_key' | 'ip_restricted' | 'referrer_restricted' | 'app_restricted' | 'quota' | 'disabled' | 'not_found' | 'network' | 'timeout' | 'unknown';

export class YoutubeApiError extends Error {
  code: YoutubeErrorCode;
  status: number;
  googleStatus: number | null;
  googleReason: string | null;

  constructor(code: YoutubeErrorCode, message: string, status = 400, details?: { googleStatus?: number | null; googleReason?: string | null }) {
    super(message);
    this.name = 'YoutubeApiError';
    this.code = code;
    this.status = status;
    this.googleStatus = details?.googleStatus ?? null;
    this.googleReason = details?.googleReason ?? null;
  }
}

export type YoutubePublicDetails = Record<string, unknown>;

export type ResolvedChannel = {
  youtubeChannelId: string;
  channelName: string | null;
  channelHandle: string | null;
  channelUrl: string;
  description: string | null;
  thumbnailUrl: string | null;
  uploadsPlaylistId: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
  publishedAt: string | null;
  country: string | null;
  publicDetails: YoutubePublicDetails;
};

export type ResolvedVideo = {
  youtubeVideoId: string;
  youtubeChannelId: string | null;
  channelTitle: string | null;
  title: string | null;
  description: string | null;
  publishedAt: string | null;
  duration: string | null;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  tags: string[];
  categoryId: string | null;
  defaultLanguage: string | null;
  defaultAudioLanguage: string | null;
  hasPaidProductPlacement: boolean | null;
  publicDetails: YoutubePublicDetails;
};

export const YOUTUBE_CONNECTED_MESSAGE = 'YouTube Data API connected successfully.';
const TEST_CHANNEL_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';

const MESSAGES = {
  invalid_key: 'Google rejected this API key. Save the current key again in YouTube Research settings, without spaces or quotes. In Google Cloud, confirm the key is active and limited to YouTube Data API v3.',
  quota: 'YouTube API quota is exhausted. Try again after the quota resets. Remaining quota is not available from the API.',
  disabled: 'YouTube Data API v3 is not enabled for this key. Enable it in Google Cloud, wait a minute, and run Test Connection again.',
  not_found: 'No public YouTube channel was found for that link. Check the @handle or channel ID. This is not an API key error.',
  network: 'The server could not reach www.googleapis.com. Check outbound HTTPS and try again.',
  timeout: 'YouTube did not respond in time. Run Test Connection again.',
  unknown: 'YouTube returned an unexpected response. Run Test Connection again and review the key restrictions in Google Cloud.',
  referrer: 'Google blocked this server because the API key is limited to website referrers. A server request has no browser referrer. Use a key restricted by this server IP, or with application restrictions set to None, and save it in YouTube Research settings.',
  app: 'Google blocked this server because the API key is limited to an Android or iOS app. Create a server key for YouTube Data API v3 and save it in YouTube Research settings.',
};

type GoogleErrorBody = {
  error?: {
    message?: string;
    errors?: { reason?: string; message?: string }[];
    details?: { reason?: string; metadata?: { callerIp?: string } }[];
  };
};

function redact(text: string) {
  return text.replace(/AIza[0-9A-Za-z_-]{10,}/g, '[redacted]').replace(/key=[^&\s]+/gi, 'key=[redacted]');
}

function googleDetail(body: GoogleErrorBody) {
  const reasons = [
    ...(body?.error?.errors || []).map((item) => item.reason || ''),
    ...(body?.error?.details || []).map((item) => item.reason || ''),
  ].filter(Boolean);
  const message = body?.error?.message || body?.error?.errors?.[0]?.message || '';
  const callerIp = (body?.error?.details || []).map((item) => item.metadata?.callerIp).find((ip) => Boolean(ip && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip))) || '';
  return { reasons, message, callerIp, reason: reasons.find((item) => item.startsWith('API_KEY_') || item === 'keyInvalid' || item === 'quotaExceeded' || item === 'accessNotConfigured' || item === 'SERVICE_DISABLED') || reasons[0] || '' };
}

function errorOf(code: YoutubeErrorCode, message: string, status: number, googleStatus: number, reason: string) {
  return new YoutubeApiError(code, redact(message), status, { googleStatus, googleReason: reason || null });
}

export function normalizeYoutubeApiKey(value: string) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, '');
}

export function classifyYoutubeError(status: number, body: GoogleErrorBody = {}) {
  const detail = googleDetail(body);
  const haystack = `${detail.reasons.join(' ')} ${detail.message}`;
  if (detail.reasons.includes('quotaExceeded') || detail.reasons.includes('dailyLimitExceeded') || detail.reasons.includes('rateLimitExceeded') || status === 429) {
    return errorOf('quota', MESSAGES.quota, 429, status, detail.reason || 'quotaExceeded');
  }
  if (detail.reasons.includes('API_KEY_IP_ADDRESS_BLOCKED') || /ip address restriction|violates this restriction/i.test(haystack)) {
    const ip = detail.callerIp || (detail.message.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/) || [])[0] || '';
    const where = ip ? `the outbound IP ${ip}` : 'an outbound IP that is not on the allow list';
    return errorOf('ip_restricted', `Google blocked this server because the API key only allows specific IP addresses. This request came from ${where}. In Google Cloud credentials, add that IP, or temporarily set application restrictions to None, run Test Connection, then restore an IP restriction for this server.`, 403, status, detail.reason || 'API_KEY_IP_ADDRESS_BLOCKED');
  }
  if (detail.reasons.includes('API_KEY_HTTP_REFERRER_BLOCKED') || /referer|referrer/i.test(haystack)) {
    return errorOf('referrer_restricted', MESSAGES.referrer, 403, status, detail.reason || 'API_KEY_HTTP_REFERRER_BLOCKED');
  }
  if (detail.reasons.includes('API_KEY_ANDROID_APP_BLOCKED') || detail.reasons.includes('API_KEY_IOS_APP_BLOCKED')) {
    return errorOf('app_restricted', MESSAGES.app, 403, status, detail.reason);
  }
  if (detail.reasons.includes('keyInvalid') || detail.reasons.includes('API_KEY_INVALID') || /api key not valid|invalid api key/i.test(detail.message)) {
    return errorOf('invalid_key', MESSAGES.invalid_key, 400, status, detail.reason || 'API_KEY_INVALID');
  }
  if (detail.reasons.includes('accessNotConfigured') || detail.reasons.includes('SERVICE_DISABLED') || /has not been used|it is disabled/i.test(haystack)) {
    return errorOf('disabled', MESSAGES.disabled, 403, status, detail.reason || 'SERVICE_DISABLED');
  }
  if (status === 404) return errorOf('not_found', MESSAGES.not_found, 404, status, detail.reason);
  const safe = redact(detail.message).slice(0, 300);
  return errorOf('unknown', safe ? `${MESSAGES.unknown} Google said: ${safe}` : MESSAGES.unknown, status >= 500 ? 502 : 400, status, detail.reason);
}

function stat(source: Record<string, string> | undefined, key: string) {
  if (!source || source[key] == null || source[key] === '') return null;
  const value = Number(source[key]);
  return Number.isFinite(value) ? value : null;
}

function thumbnail(snippet: { thumbnails?: Record<string, { url?: string }> } | undefined) {
  const thumbs = snippet?.thumbnails || {};
  return thumbs.maxres?.url || thumbs.standard?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || null;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function keywordList(raw: unknown) {
  const text = String(raw || '').trim();
  if (!text) return [];
  return [...new Set((text.match(/"[^"]+"|\S+/g) || []).map((item) => item.replace(/^"|"$/g, '').trim()).filter(Boolean))];
}

function mapChannel(item: Record<string, any>): ResolvedChannel | null {
  const id = String(item?.id || '');
  if (!id) return null;
  const snippet = item.snippet || {};
  const branding = item.brandingSettings || {};
  const handle = snippet.customUrl ? String(snippet.customUrl).replace(/^@/, '') : null;
  const country = snippet.country || branding.channel?.country || null;
  return {
    youtubeChannelId: id,
    channelName: snippet.title || null,
    channelHandle: handle,
    channelUrl: `https://www.youtube.com/channel/${id}`,
    description: snippet.description || null,
    thumbnailUrl: thumbnail(snippet),
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || null,
    subscriberCount: stat(item.statistics, 'subscriberCount'),
    videoCount: stat(item.statistics, 'videoCount'),
    viewCount: stat(item.statistics, 'viewCount'),
    publishedAt: snippet.publishedAt || null,
    country,
    publicDetails: {
      country,
      keywords: keywordList(branding.channel?.keywords),
      bannerUrl: branding.image?.bannerExternalUrl || null,
      unsubscribedTrailer: branding.channel?.unsubscribedTrailer || null,
      defaultLanguage: snippet.defaultLanguage || branding.channel?.defaultLanguage || null,
      topicCategories: stringList(item.topicDetails?.topicCategories),
      hiddenSubscriberCount: item.statistics?.hiddenSubscriberCount === true,
      privacyStatus: item.status?.privacyStatus || null,
      isLinked: typeof item.status?.isLinked === 'boolean' ? item.status.isLinked : null,
      madeForKids: typeof item.status?.madeForKids === 'boolean' ? item.status.madeForKids : null,
    },
  };
}

function mapVideo(item: Record<string, any>): ResolvedVideo | null {
  const id = String(item?.id || '');
  if (!id) return null;
  const snippet = item.snippet || {};
  const details = item.contentDetails || {};
  const status = item.status || {};
  const stats = item.statistics || {};
  const topics = item.topicDetails || {};
  const recording = item.recordingDetails || {};
  const live = item.liveStreamingDetails || {};
  return {
    youtubeVideoId: id,
    youtubeChannelId: snippet.channelId || null,
    channelTitle: snippet.channelTitle || null,
    title: snippet.title || null,
    description: snippet.description ?? null,
    publishedAt: snippet.publishedAt || null,
    duration: details.duration || null,
    thumbnailUrl: thumbnail(snippet),
    viewCount: stat(stats, 'viewCount'),
    likeCount: stat(stats, 'likeCount'),
    commentCount: stat(stats, 'commentCount'),
    tags: stringList(snippet.tags),
    categoryId: snippet.categoryId || null,
    defaultLanguage: snippet.defaultLanguage || null,
    defaultAudioLanguage: snippet.defaultAudioLanguage || null,
    hasPaidProductPlacement: typeof item.paidProductPlacementDetails?.hasPaidProductPlacement === 'boolean'
      ? item.paidProductPlacementDetails.hasPaidProductPlacement
      : null,
    publicDetails: {
      definition: details.definition || null,
      caption: details.caption === 'true' ? true : details.caption === 'false' ? false : null,
      licensedContent: typeof details.licensedContent === 'boolean' ? details.licensedContent : null,
      dimension: details.dimension || null,
      projection: details.projection || null,
      privacyStatus: status.privacyStatus || null,
      license: status.license || null,
      embeddable: typeof status.embeddable === 'boolean' ? status.embeddable : null,
      publicStatsViewable: typeof status.publicStatsViewable === 'boolean' ? status.publicStatsViewable : null,
      madeForKids: typeof status.madeForKids === 'boolean' ? status.madeForKids : null,
      liveBroadcastContent: snippet.liveBroadcastContent || null,
      favoriteCount: stat(stats, 'favoriteCount'),
      topicCategories: stringList(topics.topicCategories),
      recordingDate: recording.recordingDate || null,
      scheduledStartTime: live.scheduledStartTime || null,
      actualStartTime: live.actualStartTime || null,
    },
  };
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function youtubeRequest(apiKey: string, path: string, params: Record<string, string | number | undefined>, fetchImpl: YoutubeFetch) {
  let lastError: YoutubeApiError | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    url.searchParams.set('key', apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
    try {
      const response = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(8000) });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return body as Record<string, any>;
      const classified = classifyYoutubeError(response.status, body);
      if (classified.code !== 'unknown') throw classified;
      lastError = classified;
    } catch (err) {
      if (err instanceof YoutubeApiError) throw err;
      const name = err instanceof Error ? err.name : '';
      lastError = name === 'TimeoutError' || name === 'AbortError'
        ? new YoutubeApiError('timeout', MESSAGES.timeout, 504)
        : new YoutubeApiError('network', MESSAGES.network, 503);
    }
    if (attempt < 2) await delay(300 * 2 ** attempt);
  }
  throw lastError || new YoutubeApiError('network', MESSAGES.network, 503);
}

export function createYoutube(apiKey: string, fetchImpl: YoutubeFetch = fetch) {
  const get = (path: string, params: Record<string, string | number | undefined>) => youtubeRequest(apiKey, path, params, fetchImpl);

  return {
    async resolve(input: string) {
      const parsed = parseChannelInput(input);
      if (!parsed.ok) throw new YoutubeApiError('not_found', parsed.error, 400);
      const params = parsed.kind === 'id'
        ? { id: parsed.value }
        : parsed.kind === 'handle'
          ? { forHandle: `@${parsed.value}` }
          : { forUsername: parsed.value };
      let data: Record<string, any>;
      try {
        data = await get('channels', { part: 'snippet,statistics,contentDetails,brandingSettings,topicDetails,status', ...params });
      } catch {
        data = await get('channels', { part: 'snippet,statistics,contentDetails', ...params });
      }
      const channel = mapChannel(data.items?.[0]);
      if (!channel) throw new YoutubeApiError('not_found', MESSAGES.not_found, 404);
      return channel;
    },
    async uploads(playlistId: string, options: { limit: number; from?: string | null; to?: string | null }) {
      const collected: { videoId: string; publishedAt: string | null }[] = [];
      let pageToken = '';
      let pages = 0;
      let truncated = false;
      const from = options.from ? `${options.from}T00:00:00.000Z` : '';
      const to = options.to ? `${options.to}T23:59:59.999Z` : '';
      while (collected.length < options.limit) {
        pages += 1;
        if (pages > 20) {
          truncated = true;
          break;
        }
        const data = await get('playlistItems', {
          part: 'contentDetails,snippet',
          playlistId,
          maxResults: Math.min(50, options.limit - collected.length),
          pageToken,
        });
        let reachedOlder = false;
        for (const item of data.items || []) {
          const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || null;
          if (!videoId) continue;
          if (to && publishedAt && publishedAt > to) continue;
          if (from && publishedAt && publishedAt < from) {
            reachedOlder = true;
            break;
          }
          collected.push({ videoId, publishedAt });
          if (collected.length >= options.limit) break;
        }
        if (reachedOlder || !data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }
      return { videos: collected.slice(0, options.limit), truncated };
    },
    async videos(ids: string[]) {
      const rows: ResolvedVideo[] = [];
      for (let index = 0; index < ids.length; index += 50) {
        const batch = ids.slice(index, index + 50);
        if (!batch.length) continue;
        let data: Record<string, any>;
        try {
          data = await get('videos', {
            part: 'snippet,statistics,contentDetails,status,topicDetails,recordingDetails,liveStreamingDetails,paidProductPlacementDetails',
            id: batch.join(','),
          });
        } catch {
          try {
            data = await get('videos', { part: 'snippet,statistics,contentDetails,status,topicDetails,paidProductPlacementDetails', id: batch.join(',') });
          } catch {
            data = await get('videos', { part: 'snippet,statistics,contentDetails', id: batch.join(',') });
          }
        }
        for (const item of data.items || []) {
          const video = mapVideo(item);
          if (video) rows.push(video);
        }
      }
      return rows;
    },
    async searchChannels(query: string) {
      const q = query.trim();
      if (q.length < 2) return [] as ResolvedChannel[];
      const data = await get('search', { part: 'snippet', type: 'channel', q, maxResults: 20 });
      return (data.items || []).map((item: Record<string, any>) => {
        const id = String(item?.id?.channelId || item?.snippet?.channelId || '');
        if (!id) return null;
        const snippet = item.snippet || {};
        return {
          youtubeChannelId: id,
          channelName: snippet.title || snippet.channelTitle || null,
          channelHandle: null,
          channelUrl: `https://www.youtube.com/channel/${id}`,
          description: snippet.description || null,
          thumbnailUrl: thumbnail(snippet),
          uploadsPlaylistId: null,
          subscriberCount: null,
          videoCount: null,
          viewCount: null,
          publishedAt: snippet.publishedAt || null,
          country: null,
          publicDetails: { platform: 'youtube' },
        } satisfies ResolvedChannel;
      }).filter(Boolean) as ResolvedChannel[];
    },
    async test() {
      const data = await get('channels', { part: 'snippet', id: TEST_CHANNEL_ID });
      const channel = mapChannel(data.items?.[0]);
      if (!channel) {
        throw new YoutubeApiError('unknown', 'YouTube responded, but did not return the expected public channel. The connection was not marked successful.', 502);
      }
      return { ok: true as const, channelId: channel.youtubeChannelId };
    },
  };
}
