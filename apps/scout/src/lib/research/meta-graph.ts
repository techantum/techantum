import { createHmac } from 'node:crypto';
import { FinanceValidationError } from '@/lib/finance/errors';
import type { ResolvedChannel, ResolvedVideo } from '@/lib/youtube/client';
import { asPlatform, type ResearchPlatform } from './platforms';
import { searchWikidataPages } from './wiki-pages';

type GraphError = { message?: string; code?: number | string; error_subcode?: number | string; type?: string };
type GraphBody = Record<string, unknown> & { error?: GraphError; data?: Record<string, unknown>[]; paging?: { cursors?: { after?: string } } };

function env(key: string) {
  return process.env[key]?.trim() || '';
}

function graphVersion() {
  return env('META_GRAPH_API_VERSION') || env('WHATSAPP_API_VERSION') || 'v21.0';
}

function graphToken() {
  return (
    env('META_ADS_ACCESS_TOKEN')
    || env('META_SYSTEM_USER_ACCESS_TOKEN')
    || (env('META_APP_ID') && env('META_APP_SECRET') ? `${env('META_APP_ID')}|${env('META_APP_SECRET')}` : '')
  );
}

function appSecret() {
  return env('META_APP_SECRET') || env('META_WHATSAPP_APP_SECRET') || env('WHATSAPP_APP_SECRET');
}

export function metaGraphConfigured() {
  return Boolean(graphToken());
}

async function graphGet(path: string, query: Record<string, string | number | undefined> = {}) {
  const token = graphToken();
  if (!token) {
    throw new FinanceValidationError('Meta Graph API is not configured. Set META_ADS_ACCESS_TOKEN or META_SYSTEM_USER_ACCESS_TOKEN (or META_APP_ID and META_APP_SECRET).');
  }
  const url = new URL(`https://graph.facebook.com/${graphVersion()}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  url.searchParams.set('access_token', token);
  const secret = appSecret();
  if (secret && !token.includes('|')) {
    url.searchParams.set('appsecret_proof', createHmac('sha256', secret).update(token).digest('hex'));
  }
  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  const body = (await response.json().catch(() => ({}))) as GraphBody;
  if (!response.ok || body.error) {
    const message = body.error?.message || `Meta Graph API returned HTTP ${response.status}`;
    throw new FinanceValidationError(message);
  }
  return body;
}

function asCount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pictureUrl(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const nested = value as { data?: { url?: string }; url?: string };
  return nested.data?.url || nested.url || null;
}

export function parseFacebookPageInput(input: string) {
  const raw = input.trim();
  if (!raw) throw new FinanceValidationError('Paste a Facebook Page URL or username.');
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '').replace(/^web\./, '');
    if (!host.includes('facebook.com') && !host.includes('fb.com') && !host.includes('fb.watch')) {
      if (/^[A-Za-z0-9.]+$/.test(raw)) return raw.replace(/^@/, '');
      throw new FinanceValidationError('Use a Facebook Page URL such as facebook.com/yourpage.');
    }
    const id = url.searchParams.get('id');
    if (id && /^\d+$/.test(id)) return id;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'pages' && parts[2] && /^\d+$/.test(parts[2])) return parts[2];
    if (parts[0] === 'profile.php' && id) return id;
    const slug = parts.find((part) => !['pages', 'people', 'public', 'pg'].includes(part.toLowerCase()));
    if (!slug) throw new FinanceValidationError('Could not read a Facebook Page from that URL.');
    return decodeURIComponent(slug).replace(/^@/, '');
  } catch (err) {
    if (err instanceof FinanceValidationError) throw err;
    if (/^[A-Za-z0-9.]+$/.test(raw.replace(/^@/, ''))) return raw.replace(/^@/, '');
    throw new FinanceValidationError('Use a Facebook Page URL such as facebook.com/yourpage.');
  }
}

export function parseInstagramUsername(input: string) {
  const raw = input.trim();
  if (!raw) throw new FinanceValidationError('Paste an Instagram URL or @username.');
  const handle = raw.replace(/^@/, '');
  try {
    const url = new URL(raw.startsWith('http') ? raw : raw.includes('instagram.com') ? `https://${raw}` : '');
    const host = url.hostname.replace(/^www\./, '');
    if (host.includes('instagram.com')) {
      const slug = url.pathname.split('/').filter(Boolean)[0] || '';
      if (!slug || ['p', 'reel', 'reels', 'stories', 'explore'].includes(slug.toLowerCase())) {
        throw new FinanceValidationError('Paste an Instagram profile URL, not a single post.');
      }
      return decodeURIComponent(slug).replace(/^@/, '');
    }
  } catch (err) {
    if (err instanceof FinanceValidationError) throw err;
  }
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) throw new FinanceValidationError('Use an Instagram @username or profile URL.');
  return handle;
}

function asChannel(platform: ResearchPlatform, row: Record<string, unknown>, handle: string | null, url: string): ResolvedChannel {
  const id = String(row.id || '');
  const name = String(row.name || row.username || handle || id);
  return {
    youtubeChannelId: id,
    channelName: name,
    channelHandle: handle || (row.username ? String(row.username) : null),
    channelUrl: url,
    description: String(row.about || row.biography || row.description || '') || null,
    thumbnailUrl: pictureUrl(row.picture) || (row.profile_picture_url ? String(row.profile_picture_url) : null),
    uploadsPlaylistId: null,
    subscriberCount: asCount(row.followers_count ?? row.fan_count),
    videoCount: asCount(row.media_count ?? row.posts_count),
    viewCount: null,
    publishedAt: null,
    country: null,
    publicDetails: { platform, ...row },
  };
}

export async function resolveFacebookPage(input: string): Promise<ResolvedChannel> {
  const key = parseFacebookPageInput(input);
  if (graphToken()) {
    try {
      const page = await graphGet(`/${encodeURIComponent(key)}`, {
        fields: 'id,name,username,link,fan_count,followers_count,about,website,picture.type(large)',
      });
      const username = page.username ? String(page.username) : key;
      const url = String(page.link || `https://www.facebook.com/${username}`);
      return asChannel('facebook', page, username, url);
    } catch {
      /* Page lookup may need extra Meta permissions. */
    }
  }
  const peeked = await peekPublicFacebook(key);
  return typedFacebookPage(key, peeked?.name || undefined, peeked?.image);
}

async function discoverySourceId() {
  const configured = env('META_INSTAGRAM_BUSINESS_ID');
  if (configured) return configured;
  const me = await graphGet('/me/accounts', { fields: 'id,name,instagram_business_account' });
  const pages = Array.isArray(me.data) ? me.data : [];
  for (const page of pages) {
    const ig = (page as { instagram_business_account?: { id?: string } }).instagram_business_account;
    if (ig?.id) return ig.id;
  }
  throw new FinanceValidationError('Connect an Instagram professional account to a Facebook Page on this Meta app, or set META_INSTAGRAM_BUSINESS_ID, to look up Instagram pages.');
}

export async function resolveInstagramPage(input: string): Promise<ResolvedChannel> {
  const username = parseInstagramUsername(input);
  if (graphToken()) {
    try {
      const source = await discoverySourceId();
      const body = await graphGet(`/${encodeURIComponent(source)}`, {
        fields: `business_discovery.username(${username}){id,username,name,profile_picture_url,followers_count,media_count,biography,website}`,
      });
      const discovered = (body.business_discovery || body) as Record<string, unknown>;
      if (discovered?.id) return asChannel('instagram', discovered, username, `https://www.instagram.com/${username}/`);
    } catch {
      /* Business discovery may need an Instagram professional token. */
    }
  }
  return {
    youtubeChannelId: username,
    channelName: prettyHandle(username),
    channelHandle: username,
    channelUrl: `https://www.instagram.com/${username}/`,
    description: null,
    thumbnailUrl: null,
    uploadsPlaylistId: null,
    subscriberCount: null,
    videoCount: null,
    viewCount: null,
    publishedAt: null,
    country: null,
    publicDetails: { platform: 'instagram', source: 'typed' },
  };
}

function asPost(platform: ResearchPlatform, post: Record<string, unknown>, channelId: string): ResolvedVideo {
  const id = String(post.id || '');
  const caption = String(post.message || post.caption || post.story || '').trim();
  const permalink = String(post.permalink_url || post.permalink || post.link || '');
  const likes = asCount((post.like_count as number) ?? (post.likes as { summary?: { total_count?: number } })?.summary?.total_count);
  const comments = asCount((post.comments_count as number) ?? (post.comments as { summary?: { total_count?: number } })?.summary?.total_count);
  const created = String(post.created_time || post.timestamp || '');
  const thumb = String(post.full_picture || post.media_url || post.thumbnail_url || '') || null;
  const mediaType = String(post.media_type || post.status_type || 'POST');
  return {
    youtubeVideoId: `${platform}:${id}`,
    youtubeChannelId: channelId,
    channelTitle: null,
    title: caption ? caption.slice(0, 120) : `${platformCopyTitle(platform)} post`,
    description: caption || null,
    publishedAt: created || null,
    duration: mediaType === 'VIDEO' || mediaType === 'REELS' || mediaType === 'video' ? 'PT0S' : null,
    thumbnailUrl: thumb,
    viewCount: asCount(post.view_count ?? post.video_views),
    likeCount: likes,
    commentCount: comments,
    tags: [],
    categoryId: null,
    defaultLanguage: null,
    defaultAudioLanguage: null,
    hasPaidProductPlacement: null,
    publicDetails: { platform, media_type: mediaType, permalink },
  };
}

function platformCopyTitle(platform: ResearchPlatform) {
  if (platform === 'facebook') return 'Facebook';
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'linkedin') return 'LinkedIn';
  return 'YouTube';
}

export async function listFacebookPosts(pageId: string, limit = 50): Promise<ResolvedVideo[]> {
  if (!graphToken()) {
    throw new FinanceValidationError('Facebook posts need a Meta Page token. Set META_ADS_ACCESS_TOKEN or META_APP_ID and META_APP_SECRET. A WhatsApp Cloud API token cannot read Pages.');
  }
  const body = await graphGet(`/${encodeURIComponent(pageId)}/posts`, {
    fields: 'id,message,created_time,permalink_url,full_picture,status_type,shares,likes.summary(true),comments.summary(true)',
    limit: Math.min(100, Math.max(1, limit)),
  });
  const rows = Array.isArray(body.data) ? body.data : [];
  return rows.map((row) => asPost('facebook', row, pageId));
}

export async function listInstagramPosts(username: string, limit = 50): Promise<{ page: ResolvedChannel; posts: ResolvedVideo[] }> {
  const source = await discoverySourceId();
  const cap = Math.min(50, Math.max(1, limit));
  const body = await graphGet(`/${encodeURIComponent(source)}`, {
    fields: `business_discovery.username(${username}){id,username,name,profile_picture_url,followers_count,media_count,biography,website,media.limit(${cap}){id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count}}`,
  });
  const discovered = (body.business_discovery || {}) as Record<string, unknown>;
  if (!discovered.id) throw new FinanceValidationError('No Instagram professional account was found for that username.');
  const page = asChannel('instagram', discovered, username, `https://www.instagram.com/${username}/`);
  const media = ((discovered.media as { data?: Record<string, unknown>[] } | undefined)?.data) || [];
  const posts = media.map((row) => asPost('instagram', row, String(discovered.id)));
  return { page, posts };
}

function mapFacebookHit(row: Record<string, unknown>): ResolvedChannel | null {
  const id = String(row.id || '');
  if (!id) return null;
  const username = row.username ? String(row.username) : null;
  return asChannel('facebook', row, username, String(row.link || `https://www.facebook.com/${username || id}`));
}

function vanityCandidates(query: string) {
  const raw = query.trim().replace(/^@/, '');
  const collapsed = raw.replace(/[^A-Za-z0-9.]/g, '');
  const dotted = raw.replace(/\s+/g, '.').replace(/[^A-Za-z0-9.]/g, '');
  return [...new Set([raw, collapsed, dotted].filter((value) => /^[A-Za-z0-9.]{2,80}$/.test(value)))];
}

function prettyHandle(handle: string) {
  return handle.replace(/[._-]+/g, ' ').replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function facebookHandleFromQuery(query: string) {
  try {
    return parseFacebookPageInput(query);
  } catch {
    const slug = query.trim().replace(/^@/, '');
    return /^[A-Za-z0-9.]{2,80}$/.test(slug) ? slug : '';
  }
}

function typedFacebookPage(handle: string, name?: string, image?: string | null): ResolvedChannel {
  return {
    youtubeChannelId: handle,
    channelName: name || prettyHandle(handle),
    channelHandle: handle,
    channelUrl: `https://www.facebook.com/${handle}`,
    description: null,
    thumbnailUrl: image || null,
    uploadsPlaylistId: null,
    subscriberCount: null,
    videoCount: null,
    viewCount: null,
    publishedAt: null,
    country: null,
    publicDetails: { platform: 'facebook', source: 'typed' },
  };
}

function metaContent(html: string, property: string) {
  const tagged = html.match(new RegExp(`property="${property}" content="([^"]+)"`, 'i'))
    || html.match(new RegExp(`content="([^"]+)" property="${property}"`, 'i'));
  return (tagged?.[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function peekPublicFacebook(handle: string) {
  try {
    const response = await fetch(`https://www.facebook.com/${encodeURIComponent(handle)}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; Hookooh/1.0; +https://hookooh.com)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const title = metaContent(html, 'og:title').replace(/\s*[|·•].*$/, '').trim();
    const image = metaContent(html, 'og:image');
    if (title && /^(facebook|log in|log into facebook|login)$/i.test(title)) {
      return image ? { name: '', image } : null;
    }
    if (!title && !image) return null;
    return { name: title, image: image || null };
  } catch {
    return null;
  }
}

export async function searchFacebookPages(query: string): Promise<ResolvedChannel[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows: ResolvedChannel[] = [];
  const seen = new Set<string>();
  const push = (item: ResolvedChannel | null) => {
    if (!item?.youtubeChannelId) return;
    const key = item.youtubeChannelId.toLowerCase();
    const handle = String(item.channelHandle || '').toLowerCase();
    if (seen.has(key) || (handle && seen.has(handle))) return;
    seen.add(key);
    if (handle) seen.add(handle);
    rows.push(item);
  };
  const handle = facebookHandleFromQuery(q);
  const pastedUrl = /facebook\.com|fb\.com/i.test(q);
  const wikiQuery = handle || q;
  const [wiki, peeked] = await Promise.all([
    pastedUrl ? Promise.resolve([] as ResolvedChannel[]) : searchWikidataPages('facebook', wikiQuery),
    handle ? peekPublicFacebook(handle) : Promise.resolve(null),
  ]);
  if (handle) push(typedFacebookPage(handle, peeked?.name || undefined, peeked?.image));
  else vanityCandidates(q).slice(0, 1).forEach((vanity) => push(typedFacebookPage(vanity)));
  wiki.forEach(push);
  if (graphToken()) {
    try {
      const body = await graphGet('/pages/search', {
        q: handle || q,
        fields: 'id,name,username,link,fan_count,followers_count,picture.type(small)',
        limit: 20,
      });
      (Array.isArray(body.data) ? body.data : []).forEach((row) => push(mapFacebookHit(row)));
    } catch {
      /* Page Public Content Access may be missing. */
    }
    try {
      const owned = await graphGet('/me/accounts', { fields: 'id,name,username,link,fan_count,picture.type(small)', limit: 100 });
      const needle = (handle || q).toLowerCase();
      (Array.isArray(owned.data) ? owned.data : [])
        .filter((row) => String(row.name || row.username || '').toLowerCase().includes(needle))
        .forEach((row) => push(mapFacebookHit(row)));
    } catch {
      /* Token may not list pages. */
    }
    if (handle) {
      try {
        push(await resolveFacebookPage(handle));
      } catch {
        /* Username may not resolve on this token. */
      }
    }
  }
  return rows.slice(0, 20);
}

export async function searchInstagramPages(query: string): Promise<ResolvedChannel[]> {
  const q = query.trim().replace(/^@/, '');
  if (q.length < 2) return [];
  const rows: ResolvedChannel[] = [];
  const seen = new Set<string>();
  const push = (item: ResolvedChannel | null) => {
    if (!item?.youtubeChannelId) return;
    const key = item.youtubeChannelId.toLowerCase();
    const handle = String(item.channelHandle || '').toLowerCase();
    if (seen.has(key) || (handle && seen.has(handle))) return;
    seen.add(key);
    if (handle) seen.add(handle);
    rows.push(item);
  };
  let handle = '';
  try {
    handle = parseInstagramUsername(query);
  } catch {
    handle = /^[A-Za-z0-9._]{2,30}$/.test(q) ? q : '';
  }
  if (handle) {
    push({
      youtubeChannelId: handle,
      channelName: prettyHandle(handle),
      channelHandle: handle,
      channelUrl: `https://www.instagram.com/${handle}/`,
      description: null,
      thumbnailUrl: null,
      uploadsPlaylistId: null,
      subscriberCount: null,
      videoCount: null,
      viewCount: null,
      publishedAt: null,
      country: null,
      publicDetails: { platform: 'instagram', source: 'typed' },
    });
  }
  const wiki = await searchWikidataPages('instagram', handle || q);
  wiki.forEach(push);
  if (graphToken() && /^[A-Za-z0-9._]{2,30}$/.test(handle || q)) {
    try {
      push(await resolveInstagramPage(handle || q));
    } catch {
      /* Username may not exist yet; continue name search. */
    }
  }
  if (!graphToken()) return rows.slice(0, 20);
  try {
    const body = await graphGet('/pages/search', {
      q,
      fields: 'id,name,username,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}',
      limit: 20,
    });
    for (const page of Array.isArray(body.data) ? body.data : []) {
      const ig = (page as { instagram_business_account?: Record<string, unknown> }).instagram_business_account;
      if (!ig?.id) continue;
      const username = String(ig.username || '');
      push(asChannel('instagram', ig, username || null, username ? `https://www.instagram.com/${username}/` : `https://www.instagram.com/`));
    }
  } catch {
    /* Search may require extra Meta permissions. */
  }
  try {
    const owned = await graphGet('/me/accounts', { fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}' });
    const needle = q.toLowerCase();
    for (const page of Array.isArray(owned.data) ? owned.data : []) {
      const ig = (page as { instagram_business_account?: Record<string, unknown> }).instagram_business_account;
      if (!ig?.id) continue;
      const hay = `${ig.username || ''} ${ig.name || ''} ${page.name || ''}`.toLowerCase();
      if (!hay.includes(needle)) continue;
      const username = String(ig.username || '');
      push(asChannel('instagram', ig, username || null, username ? `https://www.instagram.com/${username}/` : `https://www.instagram.com/`));
    }
  } catch {
    /* Token may not list pages. */
  }
  return rows.slice(0, 20);
}

export async function resolveSocialPage(platform: ResearchPlatform, input: string) {
  const kind = asPlatform(platform);
  if (kind === 'facebook') return resolveFacebookPage(input);
  if (kind === 'instagram') return resolveInstagramPage(input);
  throw new FinanceValidationError('Use Meta Graph for Facebook or Instagram pages.');
}

export async function listSocialPosts(platform: ResearchPlatform, channel: { youtube_channel_id: string; channel_handle?: string | null }) {
  const kind = asPlatform(platform);
  if (kind === 'facebook') return listFacebookPosts(channel.youtube_channel_id);
  if (kind === 'instagram') {
    const username = String(channel.channel_handle || '').replace(/^@/, '') || channel.youtube_channel_id;
    const listed = await listInstagramPosts(username);
    return listed.posts;
  }
  throw new FinanceValidationError('Use Meta Graph for Facebook or Instagram posts.');
}
