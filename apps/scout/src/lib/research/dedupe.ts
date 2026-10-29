import type { ResolvedVideo } from '@/lib/youtube/client';

const KIND_RANK: Record<string, number> = {
  REEL: 4,
  VIDEO: 3,
  PHOTO: 2,
  LINK: 1,
  POST: 0,
  AD: 5,
  BOOSTED: 5,
};

function kindOf(video: ResolvedVideo) {
  return String(video.categoryId || (video.publicDetails as { media_type?: string } | undefined)?.media_type || 'POST').toUpperCase();
}

export function isPaidItem(video: ResolvedVideo) {
  const kind = kindOf(video);
  return video.hasPaidProductPlacement === true || kind === 'AD' || kind === 'BOOSTED';
}

function permalinkOf(video: ResolvedVideo) {
  const details = (video.publicDetails || {}) as { permalink?: string; permalink_url?: string };
  return String(details.permalink || details.permalink_url || '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
}

function objectIdOf(video: ResolvedVideo) {
  const raw = String(video.youtubeVideoId || '').replace(/^(facebook|instagram|linkedin):/i, '');
  const ad = raw.match(/(?:^|:)(?:ad|adlib):([^:]+)$/i);
  if (ad?.[1]) return ad[1].toLowerCase();
  const underscore = raw.match(/_(\d+)$/);
  if (underscore?.[1]) return underscore[1];
  const tail = raw.split(':').pop() || raw;
  return tail.toLowerCase();
}

function fingerprint(video: ResolvedVideo) {
  const permalink = permalinkOf(video);
  if (permalink && !permalink.includes('facebook.com/ads')) return `url:${permalink}`;
  const objectId = objectIdOf(video);
  if (objectId && objectId.length >= 6) return `id:${video.youtubeChannelId || ''}:${objectId}`;
  const title = String(video.title || '').replace(/\s+/g, ' ').trim().slice(0, 60).toLowerCase();
  const published = String(video.publishedAt || '').slice(0, 10);
  if (title && published) return `text:${video.youtubeChannelId || ''}:${published}:${title}`;
  return `row:${video.youtubeVideoId}`;
}

function maxCount(left: number | null, right: number | null) {
  if (left == null) return right;
  if (right == null) return left;
  return Math.max(left, right);
}

function mergeVideo(current: ResolvedVideo, extra: ResolvedVideo): ResolvedVideo {
  const currentKind = kindOf(current);
  const extraKind = kindOf(extra);
  const preferExtra = (KIND_RANK[extraKind] || 0) > (KIND_RANK[currentKind] || 0);
  const description = String(extra.description || '').length > String(current.description || '').length ? extra.description : current.description;
  const title = String(extra.title || '').length > String(current.title || '').length ? extra.title : current.title;
  return {
    ...current,
    ...(preferExtra ? extra : {}),
    title,
    description,
    thumbnailUrl: current.thumbnailUrl || extra.thumbnailUrl,
    viewCount: maxCount(current.viewCount, extra.viewCount),
    likeCount: maxCount(current.likeCount, extra.likeCount),
    commentCount: maxCount(current.commentCount, extra.commentCount),
    tags: [...new Set([...(current.tags || []), ...(extra.tags || [])])],
    categoryId: preferExtra ? extra.categoryId : current.categoryId,
    hasPaidProductPlacement: current.hasPaidProductPlacement || extra.hasPaidProductPlacement,
    publicDetails: { ...(current.publicDetails || {}), ...(extra.publicDetails || {}) },
  };
}

function mergeGroup(items: ResolvedVideo[]) {
  const map = new Map<string, ResolvedVideo>();
  for (const item of items) {
    const key = fingerprint(item);
    const existing = map.get(key);
    map.set(key, existing ? mergeVideo(existing, item) : item);
  }
  return [...map.values()];
}

export function dedupeResolvedVideos(items: ResolvedVideo[]) {
  const posts = mergeGroup(items.filter((item) => !isPaidItem(item)));
  const ads = mergeGroup(items.filter((item) => isPaidItem(item)));
  for (const ad of ads) {
    const objectId = objectIdOf(ad);
    const post = posts.find((item) => objectId && objectId.length >= 6 && objectIdOf(item) === objectId);
    if (!post) continue;
    post.viewCount = maxCount(post.viewCount, ad.viewCount);
    post.likeCount = maxCount(post.likeCount, ad.likeCount);
    post.commentCount = maxCount(post.commentCount, ad.commentCount);
    if (String(ad.description || '').length > String(post.description || '').length) post.description = ad.description;
    if (!post.thumbnailUrl && ad.thumbnailUrl) post.thumbnailUrl = ad.thumbnailUrl;
  }
  return [...posts, ...ads];
}
