import { channelPublicUrl, watchUrl } from './parse';

export const YOUTUBE_DATA_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isFresh(value: string | Date | null | undefined, now = Date.now()) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  return now - time < YOUTUBE_DATA_MAX_AGE_MS;
}

function count(value: unknown) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function presentChannel<T extends Record<string, unknown>>(row: T, now = Date.now()) {
  const fresh = isFresh(row.last_refreshed_at as string | null, now);
  const youtubeId = String(row.youtube_channel_id || '');
  return {
    ...row,
    stale: !fresh,
    public_url: youtubeId ? channelPublicUrl(youtubeId) : null,
    channel_name: fresh ? row.channel_name || null : null,
    channel_handle: fresh ? row.channel_handle || null : null,
    channel_url: fresh ? row.channel_url || null : null,
    description: fresh ? row.description || null : null,
    thumbnail_url: fresh ? row.thumbnail_url || null : null,
    uploads_playlist_id: fresh ? row.uploads_playlist_id || null : null,
    subscriber_count: fresh ? count(row.subscriber_count) : null,
    video_count: fresh ? count(row.video_count) : null,
    view_count: fresh ? count(row.view_count) : null,
    channel_published_at: fresh ? row.channel_published_at || null : null,
    videos_imported: count(row.videos_imported) || 0,
  };
}

export function presentVideo<T extends Record<string, unknown>>(row: T, now = Date.now()) {
  const fresh = isFresh(row.fetched_at as string | null, now);
  const channelFresh = isFresh((row.channel_refreshed_at as string | null) || null, now);
  const youtubeId = String(row.youtube_video_id || '');
  return {
    ...row,
    stale: !fresh,
    channel_stale: !channelFresh,
    watch_url: youtubeId ? watchUrl(youtubeId) : null,
    title: fresh ? row.title || null : null,
    video_url: fresh ? row.video_url || null : null,
    description: fresh ? row.description ?? null : null,
    published_at: fresh ? row.published_at || null : null,
    duration: fresh ? row.duration || null : null,
    thumbnail_url: fresh ? row.thumbnail_url || null : null,
    view_count: fresh ? count(row.view_count) : null,
    like_count: fresh ? count(row.like_count) : null,
    comment_count: fresh ? count(row.comment_count) : null,
    tags: fresh ? (Array.isArray(row.tags) ? row.tags : []) : null,
    category_id: fresh ? row.category_id || null : null,
    default_language: fresh ? row.default_language || null : null,
    default_audio_language: fresh ? row.default_audio_language || null : null,
    duration_seconds: fresh ? count(row.duration_seconds) : null,
    has_paid_product_placement: fresh
      ? (row.has_paid_product_placement == null ? null : Boolean(row.has_paid_product_placement))
      : null,
    channel_name: channelFresh ? row.channel_name || null : null,
    topic_name: row.topic_name || null,
    thumbnail_caption: row.thumbnail_caption || null,
    research_notes: row.research_notes || null,
  };
}
