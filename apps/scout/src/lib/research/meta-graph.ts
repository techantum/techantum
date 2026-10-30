import { createHmac } from 'node:crypto';
import { FinanceValidationError } from '@/lib/finance/errors';
import type { ResolvedChannel, ResolvedVideo } from '@/lib/youtube/client';
import { dedupeResolvedVideos } from './dedupe';
import { belongsToFacebookPage, extractFacebookStories, facebookGraphId, postImageUrl } from './facebook-parse';
import { asPlatform, type ResearchPlatform } from './platforms';
import { searchWikidataPages } from './wiki-pages';

type GraphError = { message?: string; code?: number | string; error_subcode?: number | string; type?: string };
type GraphBody = Record<string, unknown> & { error?: GraphError; data?: Record<string, unknown>[]; paging?: { cursors?: { after?: string } } };

function env(key: string) {
  return process.env[key]?.trim() || '';
}

function cleanGraphToken(raw: string) {
  let value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value.replace(/^=+/, '').replace(/>+$/g, '').trim();
}

function graphVersion() {
  return env('META_GRAPH_API_VERSION') || env('WHATSAPP_API_VERSION') || 'v21.0';
}

function appSecret() {
  return env('META_APP_SECRET') || env('META_WHATSAPP_APP_SECRET') || env('WHATSAPP_APP_SECRET');
}

const rejectedGraphTokens = new Set<string>();
let graphBlock: { kind: '' | 'expired' | 'permission'; detail: string } = { kind: '', detail: '' };

export function resetGraphTokenState() {
  rejectedGraphTokens.clear();
  graphBlock = { kind: '', detail: '' };
}

function noteGraphBlock(error?: GraphError) {
  const message = String(error?.message || '');
  if (isDeadTokenError(error)) {
    graphBlock = {
      kind: 'expired',
      detail: message.match(/expired on ([^.]+)/i)?.[1]?.trim() || graphBlock.detail,
    };
    return;
  }
  if (graphBlock.kind === 'expired') return;
  if (/permission|page public content|pages_read_engagement/i.test(message)) {
    graphBlock = { kind: 'permission', detail: '' };
  }
}

function expiredMetaTokenMessage() {
  const when = graphBlock.detail ? ` on ${graphBlock.detail}` : '';
  return `The Meta ads token expired${when}. Paste a new token in Business Research settings under Facebook & Instagram, or connect the Page with a Page admin login.`;
}

function appAccessToken() {
  const secret = appSecret();
  const appId = env('META_APP_ID') || env('NEXT_PUBLIC_META_APP_ID');
  return appId && secret ? `${appId}|${secret}` : '';
}

function tokenLooksUnusable(raw: string) {
  const original = String(raw || '');
  if (!original.trim()) return true;
  if (original.includes('\n') || />\s*$/.test(original) || /^=+EA/.test(original.trim())) return true;
  const cleaned = cleanGraphToken(original);
  if (!cleaned) return true;
  if (cleaned.includes('|')) return false;
  return !/^EA[A-Za-z0-9_-]{80,}$/.test(cleaned);
}

function graphTokenCandidates(override = '') {
  const listed = [
    cleanGraphToken(override),
    tokenLooksUnusable(env('META_ADS_ACCESS_TOKEN')) ? '' : cleanGraphToken(env('META_ADS_ACCESS_TOKEN')),
    tokenLooksUnusable(env('META_SYSTEM_USER_ACCESS_TOKEN')) ? '' : cleanGraphToken(env('META_SYSTEM_USER_ACCESS_TOKEN')),
    appAccessToken(),
  ].filter(Boolean);
  return [...new Set(listed)].filter((token) => !rejectedGraphTokens.has(token));
}

function graphToken() {
  return graphTokenCandidates()[0] || '';
}

function isDeadTokenError(error?: GraphError) {
  const code = Number(error?.code);
  const message = String(error?.message || '');
  return code === 190 || /malformed access token|invalid oauth access token|error validating access token|session has expired/i.test(message);
}

export function metaGraphConfigured() {
  return Boolean(graphToken());
}

async function graphGetOnce(path: string, query: Record<string, string | number | undefined>, token: string, timeoutMs: number) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  url.searchParams.set('access_token', token);
  const secret = appSecret();
  if (secret && !token.includes('|')) {
    url.searchParams.set('appsecret_proof', createHmac('sha256', secret).update(token).digest('hex'));
  }
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as GraphBody;
  if (!response.ok || body.error) {
    noteGraphBlock(body.error);
    if (isDeadTokenError(body.error)) rejectedGraphTokens.add(token);
    throw new FinanceValidationError(body.error?.message || `Meta Graph API returned HTTP ${response.status}`);
  }
  return body;
}

async function graphGet(path: string, query: Record<string, string | number | undefined> = {}, tokenOverride = '', timeoutMs = 12000) {
  const tokens = tokenOverride ? graphTokenCandidates(tokenOverride) : graphTokenCandidates();
  if (!tokens.length) {
    throw new FinanceValidationError('Meta Graph API is not configured. Set META_ADS_ACCESS_TOKEN or META_SYSTEM_USER_ACCESS_TOKEN (or META_APP_ID and META_APP_SECRET).');
  }
  let last: FinanceValidationError | null = null;
  for (const token of tokens) {
    try {
      return await graphGetOnce(path, query, token, timeoutMs);
    } catch (err) {
      last = err instanceof FinanceValidationError ? err : new FinanceValidationError(String(err));
      const message = last.message;
      if (rejectedGraphTokens.has(token) || /does not exist|missing permission|not have permission|requires the |pages_read_engagement|page public content|application does not have permission|oauth/i.test(message)) continue;
      throw last;
    }
  }
  throw last || new FinanceValidationError('Meta Graph API request failed.');
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

type OwnedPage = { id?: string; name?: string; username?: string; access_token?: string };

let ownedPagesCache: { at: number; pages: OwnedPage[] } | null = null;

async function ownedFacebookPages(): Promise<OwnedPage[]> {
  if (!graphToken()) return [];
  if (ownedPagesCache && Date.now() - ownedPagesCache.at < 60_000) return ownedPagesCache.pages;
  try {
    const body = await graphGet('/me/accounts', { fields: 'id,name,username,access_token', limit: 100 });
    const pages = Array.isArray(body.data) ? (body.data as OwnedPage[]) : [];
    ownedPagesCache = { at: Date.now(), pages };
    return pages;
  } catch {
    ownedPagesCache = { at: Date.now(), pages: [] };
    return [];
  }
}

export function resetFacebookPageCache() {
  resetGraphTokenState();
}

export async function probeFacebookAccess() {
  ownedPagesCache = null;
  if (!graphToken()) {
    return {
      configured: false,
      pages: [] as { id?: string; name?: string; username?: string }[],
      message: 'Save the Meta App ID, App Secret, and a Page or ads token, then test again.',
    };
  }
  const pages = await ownedFacebookPages();
  return {
    configured: true,
    pages: pages.map((page) => ({ id: page.id, name: page.name, username: page.username })),
    message: pages.length
      ? `This token can read ${pages.length} Facebook Page${pages.length === 1 ? '' : 's'}. Connect the project Page to import clicks, views, and ads.`
      : 'Graph is reachable, but this token lists no Pages. Connect Facebook as a Page admin, or use a system user assigned to the Page.',
  };
}

function matchOwnedPage(pages: OwnedPage[], ...keys: Array<string | null | undefined>) {
  const needles = keys.map((key) => String(key || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
  return pages.find((page) => {
    const hay = [page.id, page.username].map((value) => String(value || '').toLowerCase()).filter(Boolean);
    return needles.some((needle) => hay.includes(needle));
  }) || null;
}

export async function resolveFacebookPage(input: string): Promise<ResolvedChannel> {
  const key = parseFacebookPageInput(input);
  const owned = matchOwnedPage(await ownedFacebookPages(), key);
  if (owned?.id) {
    try {
      const page = await graphGet(`/${encodeURIComponent(owned.id)}`, {
        fields: 'id,name,username,link,fan_count,followers_count,about,picture.type(large)',
      }, owned.access_token || '');
      const username = String(page.username || owned.username || key);
      return asChannel('facebook', page, username, String(page.link || `https://www.facebook.com/${username}`));
    } catch {
      const username = owned.username || key;
      return {
        ...typedFacebookPage(username, owned.name, null),
        youtubeChannelId: String(owned.id),
        publicDetails: { platform: 'facebook', source: 'owned' },
      };
    }
  }
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
  const peeked = await peekPublicInstagram(username);
  return {
    youtubeChannelId: username,
    channelName: peeked?.name || prettyHandle(username),
    channelHandle: username,
    channelUrl: `https://www.instagram.com/${username}/`,
    description: null,
    thumbnailUrl: peeked?.image || null,
    uploadsPlaylistId: null,
    subscriberCount: null,
    videoCount: null,
    viewCount: null,
    publishedAt: null,
    country: null,
    publicDetails: { platform: 'instagram', source: 'typed' },
  };
}

const POST_FIELDS = 'id,from,message,story,created_time,permalink_url,full_picture,status_type,shares,likes.summary(true),comments.summary(true),reactions.summary(true),attachments{media_type,type,title,description,url,unshimmed_url,media,subattachments},insights.metric(post_impressions,post_video_views,post_engaged_users)';
const POST_FIELDS_BASIC = 'id,from,message,story,created_time,permalink_url,full_picture,status_type,shares,likes.summary(true),comments.summary(true),reactions.summary(true),attachments{media_type,type,title,description,url,unshimmed_url,media,subattachments}';

type FacebookKind = 'POST' | 'PHOTO' | 'VIDEO' | 'REEL' | 'LINK' | 'AD' | 'BOOSTED';

function attachmentType(post: Record<string, unknown>) {
  const attachments = (post.attachments as { data?: Record<string, unknown>[] } | undefined)?.data || [];
  return String(attachments[0]?.media_type || attachments[0]?.type || '').toLowerCase();
}

function facebookKind(post: Record<string, unknown>, forced?: FacebookKind): FacebookKind {
  if (forced) return forced;
  const status = String(post.status_type || post.media_type || '').toLowerCase();
  const media = attachmentType(post);
  if (status === 'ad' || media === 'ad') return 'AD';
  if (status === 'boosted' || media === 'boosted') return 'BOOSTED';
  if (status.includes('reel') || media.includes('reel')) return 'REEL';
  if (status.includes('video') || media === 'video' || post.source) return 'VIDEO';
  if (status.includes('photo') || media === 'photo' || media === 'album' || post.images) return 'PHOTO';
  if (status === 'shared_story' || media === 'link' || media === 'share') return 'LINK';
  return 'POST';
}

function graphSummary(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'number' || typeof value === 'string') return asCount(value);
  const row = value as { summary?: { total_count?: number }; count?: number; total_count?: number };
  return asCount(row.summary?.total_count ?? row.count ?? row.total_count);
}

function insightMetric(post: Record<string, unknown>, names: string[]) {
  const rows = ((post.insights as { data?: { name?: string; values?: { value?: unknown }[] }[] } | undefined)?.data) || [];
  for (const name of names) {
    const hit = rows.find((row) => row.name === name);
    const value = hit?.values?.[0]?.value;
    if (typeof value === 'number') return asCount(value);
    if (value && typeof value === 'object') {
      const total = Object.values(value as Record<string, unknown>).reduce((sum, item) => sum + (Number(item) || 0), 0);
      if (total) return total;
    }
  }
  return null;
}

function impressionBand(value: unknown) {
  if (!value || typeof value !== 'object') return asCount(value);
  const band = value as { lower_bound?: string | number; upper_bound?: string | number };
  return asCount(band.lower_bound ?? band.upper_bound);
}

function attachmentCaption(post: Record<string, unknown>) {
  const attachments = (post.attachments as { data?: Record<string, unknown>[] } | undefined)?.data || [];
  const first = attachments[0] || {};
  return String(first.title || first.description || '').trim();
}

function asPost(platform: ResearchPlatform, post: Record<string, unknown>, channelId: string, forced?: FacebookKind): ResolvedVideo {
  const id = String(post.id || '');
  const caption = String(post.message || post.caption || post.story || post.name || attachmentCaption(post) || '').trim();
  const permalink = String(post.permalink_url || post.permalink || post.link || post.ad_snapshot_url || '');
  const likes = graphSummary(post.like_count ?? post.likes ?? post.reactions);
  const comments = graphSummary(post.comments_count ?? post.comments);
  const shares = graphSummary(post.shares);
  const created = String(post.created_time || post.timestamp || post.ad_creation_time || '');
  const thumb = postImageUrl(post) || null;
  const kind = facebookKind(post, forced);
  const paid = kind === 'AD' || kind === 'BOOSTED';
  const impressions = insightMetric(post, ['post_impressions', 'impressions']) ?? impressionBand(post.impressions);
  const clicks = asCount(post.clicks) ?? insightMetric(post, ['post_clicks', 'post_clicks_by_type']);
  const engaged = insightMetric(post, ['post_engaged_users', 'post_engagements']);
  const views = asCount(post.view_count ?? post.views ?? post.video_views)
    ?? insightMetric(post, ['post_video_views', 'post_impressions', 'post_engaged_users'])
    ?? impressions;
  const raw = id.replace(/^facebook:/i, '').replace(/^instagram:/i, '');
  const scopedId = channelId && raw && !raw.startsWith(`${channelId}:`) && !raw.startsWith(`${channelId}_`)
    ? `${channelId}:${raw}`
    : (raw || id);
  return {
    youtubeVideoId: `${platform}:${scopedId}`,
    youtubeChannelId: channelId,
    channelTitle: null,
    title: caption ? caption.slice(0, 120) : `${platformCopyTitle(platform)} ${kind === 'POST' ? 'post' : kind.toLowerCase()}`,
    description: caption || null,
    publishedAt: created || null,
    duration: kind === 'VIDEO' || kind === 'REEL' ? 'PT0S' : null,
    thumbnailUrl: thumb,
    viewCount: views,
    likeCount: likes,
    commentCount: comments,
    tags: [kind.toLowerCase(), paid ? 'paid' : 'organic', paid ? 'ad' : ''].filter(Boolean),
    categoryId: kind,
    defaultLanguage: null,
    defaultAudioLanguage: null,
    hasPaidProductPlacement: paid,
    publicDetails: {
      platform,
      media_type: kind,
      permalink,
      source: post.source_kind || null,
      shares,
      page_id: channelId,
      graph_id: raw || id,
      clicks,
      impressions,
      engaged_users: engaged,
      spend: asCount(post.spend),
      ctr: asCount(post.ctr),
      cpc: asCount(post.cpc),
      reach: asCount(post.reach),
    },
  };
}

function platformCopyTitle(platform: ResearchPlatform) {
  if (platform === 'facebook') return 'Facebook';
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'linkedin') return 'LinkedIn';
  return 'YouTube';
}

function applyInsightRow(video: ResolvedVideo, insights: { name?: string; values?: { value?: unknown }[] }[]) {
  const post = { insights: { data: insights } } as Record<string, unknown>;
  const impressions = insightMetric(post, ['post_impressions', 'impressions']);
  const clicks = insightMetric(post, ['post_clicks', 'post_clicks_by_type']);
  const engaged = insightMetric(post, ['post_engaged_users', 'post_engagements']);
  const views = insightMetric(post, ['post_video_views']) ?? impressions;
  const details = { ...(video.publicDetails || {}) };
  if (impressions != null) details.impressions = impressions;
  if (clicks != null) details.clicks = clicks;
  if (engaged != null) details.engaged_users = engaged;
  video.publicDetails = details;
  if (views != null && (video.viewCount == null || video.viewCount === 0)) video.viewCount = views;
  if (clicks != null && details.clicks) video.publicDetails = details;
  return video;
}

async function enrichOwnedPostInsights(rows: ResolvedVideo[], token: string) {
  if (!token || !rows.length) return rows;
  const ids = [...new Set(rows.map((row) => facebookGraphId(row)).filter((id) => /^\d+_\d+$/.test(id) || /^\d{8,}$/.test(id)))].slice(0, 40);
  if (!ids.length) return rows;
  const found = await graphLookupIds(ids, 'id,insights.metric(post_impressions,post_clicks,post_engaged_users,post_video_views)');
  return rows.map((row) => {
    const graph = found.get(facebookGraphId(row));
    const insights = ((graph?.insights as { data?: { name?: string; values?: { value?: unknown }[] }[] } | undefined)?.data) || [];
    return insights.length ? applyInsightRow(row, insights) : row;
  });
}

async function enrichAdInsights(rows: ResolvedVideo[], token: string) {
  if (!token || !rows.length) return rows;
  return Promise.all(rows.map(async (row) => {
    const adId = facebookGraphId(row).replace(/^.*ad(?:lib)?:/, '');
    if (!/^\d{8,}$/.test(adId)) return row;
    try {
      const body = await graphGet(`/${encodeURIComponent(adId)}/insights`, {
        fields: 'impressions,clicks,spend,ctr,cpc,reach',
        date_preset: 'maximum',
      }, token, 12000);
      const stats = (Array.isArray(body.data) ? body.data[0] : body) as Record<string, unknown> | undefined;
      if (!stats) return row;
      const details = { ...(row.publicDetails || {}) };
      const impressions = asCount(stats.impressions);
      const clicks = asCount(stats.clicks);
      if (impressions != null) details.impressions = impressions;
      if (clicks != null) details.clicks = clicks;
      details.spend = asCount(stats.spend);
      details.ctr = asCount(stats.ctr);
      details.cpc = asCount(stats.cpc);
      details.reach = asCount(stats.reach);
      row.publicDetails = details;
      if (impressions != null && (row.viewCount == null || row.viewCount === 0)) row.viewCount = impressions;
      return row;
    } catch {
      return row;
    }
  }));
}

function matchesPage(pageId: string, ...values: Array<string | null | undefined>) {
  const want = String(pageId || '').replace(/^@/, '').toLowerCase();
  if (!want) return false;
  return values.some((value) => String(value || '').replace(/^@/, '').toLowerCase() === want);
}

async function collectGraphEdge(path: string, query: Record<string, string | number | undefined>, token: string, cap: number) {
  const rows: Record<string, unknown>[] = [];
  let after = '';
  let fields = String(query.fields || POST_FIELDS);
  while (rows.length < cap) {
    try {
      const body = await graphGet(path, {
        ...query,
        fields,
        limit: Math.min(100, cap - rows.length),
        after: after || undefined,
      }, token);
      const chunk = Array.isArray(body.data) ? body.data : [];
      rows.push(...chunk);
      after = String(body.paging?.cursors?.after || '');
      if (!chunk.length || !after) break;
    } catch {
      if (fields === POST_FIELDS) {
        fields = POST_FIELDS_BASIC;
        continue;
      }
      break;
    }
  }
  return rows.slice(0, cap);
}

async function listFacebookAdsForPage(pageId: string, limit: number): Promise<ResolvedVideo[]> {
  if (!graphToken() || !pageId) return [];
  try {
    const accounts = await graphGet('/me/adaccounts', { fields: 'id', limit: 10 });
    const listed = await Promise.all((Array.isArray(accounts.data) ? accounts.data : []).map(async (account) => {
      const actId = String(account.id || '');
      if (!actId) return [] as ResolvedVideo[];
      try {
        const ads = await graphGet(`/${encodeURIComponent(actId)}/ads`, {
          fields: 'id,name,status,created_time,creative{id,title,body,image_url,thumbnail_url,object_story_spec,effective_object_story_id}',
          limit: Math.min(25, Math.max(1, limit)),
        });
        const rows: ResolvedVideo[] = [];
        for (const ad of Array.isArray(ads.data) ? ads.data : []) {
          const creative = (ad.creative || {}) as Record<string, unknown>;
          const spec = (creative.object_story_spec || {}) as { page_id?: string; link_data?: { message?: string; picture?: string } };
          const story = String(creative.effective_object_story_id || '');
          const storyPage = story.includes('_') ? story.split('_')[0] : '';
          if (!matchesPage(pageId, spec.page_id, storyPage)) continue;
          const id = String(ad.id || '');
          if (!id) continue;
          const caption = String(creative.body || spec.link_data?.message || ad.name || '').trim();
          rows.push(asPost('facebook', {
            id: `${pageId}:ad:${id}`,
            message: caption,
            created_time: String(ad.created_time || ''),
            permalink_url: story ? `https://www.facebook.com/${story}` : `https://www.facebook.com/${pageId}`,
            full_picture: String(creative.image_url || creative.thumbnail_url || spec.link_data?.picture || ''),
            status_type: 'AD',
            source_kind: 'adaccount',
          }, pageId, 'AD'));
        }
        return rows;
      } catch {
        return [] as ResolvedVideo[];
      }
    }));
    const seen = new Set<string>();
    const rows: ResolvedVideo[] = [];
    for (const item of listed.flat()) {
      if (!item.youtubeVideoId || seen.has(item.youtubeVideoId)) continue;
      seen.add(item.youtubeVideoId);
      rows.push(item);
      if (rows.length >= limit) break;
    }
    return rows;
  } catch {
    return [];
  }
}

function adReachedCountries() {
  const raw = env('META_AD_REACHED_COUNTRIES') || 'IN,US,GB,AE,SG,AU,CA';
  const countries = raw.split(',').map((item) => item.trim().toUpperCase()).filter((item) => /^[A-Z]{2}$/.test(item));
  return countries.length ? countries.slice(0, 10) : ['IN', 'US'];
}

async function snapshotImage(url: string) {
  if (!url.startsWith('http')) return '';
  const html = await fetchPublicHtml(url, 5000);
  return metaContent(html, 'og:image') || html.match(/src="(https:\/\/(?:scontent|external)[^"]+)"/i)?.[1] || '';
}

async function listAdLibrary(pageId: string, name: string, limit: number): Promise<ResolvedVideo[]> {
  if (!graphToken()) return [];
  const fields = 'id,ad_creation_time,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,page_id,page_name,publisher_platforms,impressions';
  const query: Record<string, string | number | undefined> = {
    ad_reached_countries: JSON.stringify(adReachedCountries()),
    ad_active_status: 'ALL',
    ad_type: 'ALL',
    fields,
    limit: Math.min(25, Math.max(1, limit)),
  };
  const numeric = /^\d{5,}$/.test(pageId);
  if (numeric) query.search_page_ids = JSON.stringify([pageId]);
  else if (name) query.search_terms = name.slice(0, 80);
  else return [];
  try {
    let body = await graphGet('/ads_archive', query);
    if (numeric && !(Array.isArray(body.data) ? body.data : []).length && name) {
      const fallback = { ...query };
      delete fallback.search_page_ids;
      fallback.search_terms = name.slice(0, 80);
      body = await graphGet('/ads_archive', fallback);
    }
    const ads = (Array.isArray(body.data) ? body.data : []).filter((ad) => {
      const adPage = String(ad.page_id || '');
      const adName = String(ad.page_name || '').toLowerCase();
      if (adPage && numeric && adPage !== pageId) return false;
      if (!numeric && name) {
        const want = name.replace(/^@/, '').toLowerCase();
        if (adName && !adName.includes(want) && !want.includes(adName)) return false;
      }
      return Boolean(ad.id);
    }).slice(0, limit);
    const images = await Promise.all(ads.slice(0, 12).map((ad) => snapshotImage(String(ad.ad_snapshot_url || ''))));
    return ads.map((ad, index) => {
      const adPage = String(ad.page_id || '');
      const id = String(ad.id || '');
      const bodies = Array.isArray(ad.ad_creative_bodies) ? ad.ad_creative_bodies : [];
      const titles = Array.isArray(ad.ad_creative_link_titles) ? ad.ad_creative_link_titles : [];
      const caption = String(bodies[0] || titles[0] || ad.page_name || 'Facebook ad').trim();
      return asPost('facebook', {
        id: `${adPage || pageId}:adlib:${id}`,
        message: caption,
        created_time: String(ad.ad_creation_time || ''),
        permalink_url: String(ad.ad_snapshot_url || ''),
        full_picture: images[index] || '',
        status_type: 'AD',
        impressions: ad.impressions,
        source_kind: 'ad_library',
      }, adPage || pageId, 'AD');
    });
  } catch {
    return [];
  }
}

async function fetchPublicHtml(url: string, timeout = 4500) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout),
    });
    return response.ok ? await response.text() : '';
  } catch {
    return '';
  }
}

async function graphLookupIds(ids: string[], fields: string) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 40);
  if (!unique.length || !graphToken()) return new Map<string, Record<string, unknown>>();
  const found = new Map<string, Record<string, unknown>>();
  for (let index = 0; index < unique.length; index += 10) {
    const chunk = unique.slice(index, index + 10);
    try {
      const body = await graphGet('/', { ids: chunk.join(','), fields }, '', 8000);
      for (const id of chunk) {
        const row = body[id];
        if (row && typeof row === 'object' && !(row as { error?: unknown }).error && (row as { id?: string }).id) {
          found.set(id, row as Record<string, unknown>);
        }
      }
    } catch {
      /* Individual public posts may be hidden from this token. */
    }
  }
  return found;
}

async function hydrateFacebookStories(
  stories: { id: string; text: string; image: string; permalink: string }[],
  pageId: string,
  cap: number,
) {
  const lookup = await graphLookupIds(
    stories.map((item) => item.id).filter((id) => /^\d+_\d+$/.test(id) || /^\d{10,}$/.test(id)),
    POST_FIELDS_BASIC,
  );
  return stories.slice(0, cap).map((story) => {
    const graph = lookup.get(story.id);
    if (graph) {
      return asPost('facebook', {
        ...graph,
        full_picture: postImageUrl(graph) || story.image,
        permalink_url: String(graph.permalink_url || story.permalink),
        source_kind: 'public',
      }, pageId);
    }
    return asPost('facebook', {
      id: story.id,
      message: story.text,
      permalink_url: story.permalink,
      full_picture: story.image,
      status_type: 'POST',
      source_kind: 'public',
    }, pageId, 'POST');
  });
}

async function fillMissingImages(rows: ResolvedVideo[]) {
  const missing = rows.filter((row) => !row.thumbnailUrl).slice(0, 12);
  if (!missing.length) return rows;
  const images = await Promise.all(missing.map(async (row) => {
    const permalink = String((row.publicDetails as { permalink?: string } | undefined)?.permalink || '');
    if (!permalink.startsWith('http')) return '';
    const html = await fetchPublicHtml(permalink, 4000);
    return metaContent(html, 'og:image');
  }));
  missing.forEach((row, index) => {
    if (images[index]) row.thumbnailUrl = images[index];
  });
  return rows;
}

async function listPublicFacebookTimeline(handle: string, pageId: string, limit: number): Promise<ResolvedVideo[]> {
  const slug = handle.replace(/^@/, '').split('/')[0];
  if (!slug) return [];
  const urls = [
    `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(`https://www.facebook.com/${slug}`)}&tabs=timeline&width=500&height=1600`,
    `https://mbasic.facebook.com/${encodeURIComponent(slug)}`,
    `https://mbasic.facebook.com/${encodeURIComponent(slug)}?v=timeline`,
    `https://www.facebook.com/${encodeURIComponent(slug)}/posts`,
  ];
  const pages = await Promise.all(urls.map((url) => fetchPublicHtml(url, 7000)));
  const stories: { id: string; text: string; image: string; permalink: string }[] = [];
  const seen = new Set<string>();
  for (const html of pages) {
    if (!html) continue;
    for (const story of extractFacebookStories(html, slug, pageId)) {
      if (seen.has(story.id)) continue;
      seen.add(story.id);
      stories.push(story);
      if (stories.length >= limit) break;
    }
    if (stories.length >= limit) break;
  }
  if (!stories.length) return [];
  return hydrateFacebookStories(stories, pageId, limit);
}

export async function resolveFacebookIdentity(pageId: string, handle?: string | null, allowOwned = true) {
  const owned = allowOwned ? matchOwnedPage(await ownedFacebookPages(), pageId, handle) : null;
  if (owned?.id) {
    return {
      id: String(owned.id),
      handle: owned.username || handle || pageId,
      name: owned.name || null,
      pageToken: owned.access_token ? String(owned.access_token) : '',
    };
  }
  const keys = [...new Set([pageId, handle].map((value) => String(value || '').replace(/^@/, '')).filter(Boolean))];
  const numeric = keys.find((key) => /^\d{5,}$/.test(key));
  if (numeric) {
    return { id: numeric, handle: handle || pageId, name: null, pageToken: '' };
  }
  if (graphToken()) {
    const looked = await Promise.all(keys.slice(0, 2).map(async (key) => {
      try {
        return await graphGet(`/${encodeURIComponent(key)}`, { fields: 'id,name,username' });
      } catch {
        return null;
      }
    }));
    const page = looked.find((row) => row?.id);
    if (page?.id) {
      return {
        id: String(page.id),
        handle: page.username ? String(page.username) : handle || pageId,
        name: page.name ? String(page.name) : null,
        pageToken: '',
      };
    }
  }
  return { id: pageId, handle: handle || pageId, name: null, pageToken: '' };
}

export async function listFacebookPosts(pageId: string, limit = 50, handle?: string | null, allowOwned = true, storedPageToken = ''): Promise<ResolvedVideo[]> {
  graphBlock = { kind: '', detail: '' };
  const cap = Math.min(100, Math.max(1, limit));
  const identity = await resolveFacebookIdentity(pageId, handle, allowOwned);
  const graphId = identity.id;
  const pageToken = storedPageToken || identity.pageToken;
  const readEdge = async (edge: string, forced?: FacebookKind, requireOwner = false) => {
    if (!graphToken() && !pageToken) return [] as ResolvedVideo[];
    const data = await collectGraphEdge(`/${encodeURIComponent(graphId)}/${edge}`, { fields: POST_FIELDS }, pageToken, cap);
    return data
      .filter((row) => !requireOwner || belongsToFacebookPage(row, graphId, identity.handle || handle))
      .map((row) => asPost('facebook', { ...row, source_kind: edge }, graphId, forced));
  };
  const listVideos = async () => {
    const token = pageToken || graphToken();
    if (!token) return [] as ResolvedVideo[];
    const videos = await collectGraphEdge(`/${encodeURIComponent(graphId)}/videos`, {
      fields: 'id,title,description,created_time,permalink_url,picture,length,views',
    }, token, cap);
    return videos.map((row) => asPost('facebook', {
      ...row,
      message: String(row.description || row.title || ''),
      name: String(row.title || ''),
      full_picture: String(row.picture || ''),
      status_type: 'VIDEO',
      source_kind: 'videos',
    }, graphId, 'VIDEO'));
  };
  const listPhotos = async () => {
    const token = pageToken || graphToken();
    if (!token) return [] as ResolvedVideo[];
    const photos = await collectGraphEdge(`/${encodeURIComponent(graphId)}/photos`, {
      fields: 'id,name,created_time,link,picture,images',
    }, token, cap);
    return photos.map((row) => asPost('facebook', {
      ...row,
      message: String(row.name || ''),
      permalink_url: String(row.link || ''),
      status_type: 'PHOTO',
      source_kind: 'photos',
    }, graphId, 'PHOTO'));
  };
  const listNested = async () => {
    const token = pageToken || graphToken();
    if (!token) return [] as ResolvedVideo[];
    try {
      const body = await graphGet(`/${encodeURIComponent(graphId)}`, {
        fields: `picture.type(large),posts.limit(${cap}){${POST_FIELDS_BASIC}}`,
      }, token);
      const data = ((body.posts as { data?: Record<string, unknown>[] } | undefined)?.data) || [];
      return data.map((row) => asPost('facebook', { ...row, source_kind: 'posts' }, graphId));
    } catch {
      return [] as ResolvedVideo[];
    }
  };
  const graphBatches = await Promise.all([
    readEdge('posts').catch(() => [] as ResolvedVideo[]),
    listNested(),
    readEdge('feed', undefined, Boolean(pageToken) ? false : true).catch(() => [] as ResolvedVideo[]),
    pageToken ? readEdge('published_posts').catch(() => [] as ResolvedVideo[]) : Promise.resolve([] as ResolvedVideo[]),
    pageToken ? readEdge('ads_posts', 'BOOSTED').catch(() => [] as ResolvedVideo[]) : Promise.resolve([] as ResolvedVideo[]),
    listVideos().catch(() => [] as ResolvedVideo[]),
    listPhotos().catch(() => [] as ResolvedVideo[]),
  ]);
  let graphRows = graphBatches.flat();
  if (pageToken) graphRows = await enrichOwnedPostInsights(graphRows, pageToken);
  const [accountAds, libraryAds, publicRows] = await Promise.all([
    listFacebookAdsForPage(graphId, cap),
    listAdLibrary(graphId, identity.name || identity.handle || handle || pageId, cap),
    graphRows.length && pageToken ? Promise.resolve([] as ResolvedVideo[]) : listPublicFacebookTimeline(identity.handle || handle || pageId, graphId, cap),
  ]);
  const ads = pageToken ? await enrichAdInsights(accountAds, pageToken) : accountAds;
  const batches = [graphRows, ads, libraryAds, publicRows];
  const rows: ResolvedVideo[] = [];
  const seen = new Set<string>();
  for (const item of batches.flat()) {
    if (!item.youtubeVideoId || seen.has(item.youtubeVideoId)) continue;
    seen.add(item.youtubeVideoId);
    rows.push(item);
  }
  const unique = await fillMissingImages(dedupeResolvedVideos(rows).filter((item) => {
    const details = (item.publicDetails || {}) as { page_id?: string; source?: string };
    if (details.source === 'ad_library' || details.source === 'adaccount' || details.source === 'public') return true;
    const page = String(details.page_id || item.youtubeChannelId || '');
    if (!page) return true;
    if (page === graphId || page === pageId) return true;
    const handleKey = String(identity.handle || handle || '').replace(/^@/, '');
    return Boolean(handleKey) && page.toLowerCase() === handleKey.toLowerCase();
  }));
  if (unique.length) return unique.slice(0, cap);
  if (graphBlock.kind === 'expired' && !pageToken) {
    throw new FinanceValidationError(expiredMetaTokenMessage());
  }
  if (!graphToken() && !pageToken) {
    throw new FinanceValidationError('Facebook posts need a Meta Page token. Connect this Page with Facebook, or set META_ADS_ACCESS_TOKEN.');
  }
  if (allowOwned) {
    throw new FinanceValidationError('Hookooh could not read this Facebook Page. Connect the Page with Facebook so we can import posts, clicks, views, likes, comments, and ads. Competitor ads still come from Ad Library.');
  }
  throw new FinanceValidationError('No competitor ads or public posts were returned. Organic competitor posts need Page Public Content Access. Competitor ads appear from Meta Ad Library when the Page is running ads in the configured countries.');
}

async function listPublicInstagramTimeline(username: string, limit: number): Promise<ResolvedVideo[]> {
  const slug = username.replace(/^@/, '').split('/')[0];
  if (!slug) return [];
  const html = await fetchPublicHtml(`https://www.instagram.com/${encodeURIComponent(slug)}/`);
  if (!html) return [];
  const rows: ResolvedVideo[] = [];
  const seen = new Set<string>();
  const codes = [...html.matchAll(/"shortcode":"([A-Za-z0-9_-]+)"/g)].map((match) => match[1]);
  const captions = [...html.matchAll(/"caption":"((?:\\.|[^"\\])*)"/g)].map((match) => match[1].replace(/\\n/g, ' ').replace(/\\"/g, '"'));
  const thumbs = [...html.matchAll(/"display_url":"((?:\\.|[^"\\])*)"/g)].map((match) => match[1].replace(/\\u0026/g, '&').replace(/\\/g, ''));
  const count = Math.max(codes.length, captions.length);
  const oembeds = await Promise.all(
    codes.slice(0, limit).map((code) => (thumbs.length ? Promise.resolve({ thumbnail: '', title: '' }) : instagramOembed(code))),
  );
  for (let index = 0; index < count && rows.length < limit; index += 1) {
    const id = codes[index] || `public:${slug}:${index + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(asPost('instagram', {
      id,
      message: captions[index] || oembeds[index]?.title || '',
      permalink_url: codes[index] ? `https://www.instagram.com/p/${codes[index]}/` : `https://www.instagram.com/${slug}/`,
      full_picture: thumbs[index] || oembeds[index]?.thumbnail || '',
      status_type: 'POST',
      source_kind: 'public',
    }, slug, 'POST'));
  }
  return rows;
}

export async function listInstagramPosts(username: string, limit = 50): Promise<{ page: ResolvedChannel; posts: ResolvedVideo[] }> {
  const cap = Math.min(50, Math.max(1, limit));
  const handle = username.replace(/^@/, '').split('/')[0];
  try {
    const source = await discoverySourceId();
    const body = await graphGet(`/${encodeURIComponent(source)}`, {
      fields: `business_discovery.username(${handle}){id,username,name,profile_picture_url,followers_count,media_count,biography,website,media.limit(${cap}){id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count}}`,
    });
    const discovered = (body.business_discovery || {}) as Record<string, unknown>;
    if (discovered.id) {
      const page = asChannel('instagram', discovered, handle, `https://www.instagram.com/${handle}/`);
      const media = ((discovered.media as { data?: Record<string, unknown>[] } | undefined)?.data) || [];
      const posts = dedupeResolvedVideos(media.map((row) => asPost('instagram', row, String(discovered.id))));
      if (posts.length) return { page, posts };
    }
  } catch {
    /* Competitor Instagram often needs a connected professional account. */
  }
  const posts = await fillMissingImages(await listPublicInstagramTimeline(handle, cap));
  if (posts.length) {
    const profile = await peekPublicInstagram(handle);
    return {
      page: {
        youtubeChannelId: handle,
        channelName: profile?.name || handle,
        channelHandle: handle,
        channelUrl: `https://www.instagram.com/${handle}/`,
        description: null,
        thumbnailUrl: profile?.image || null,
        uploadsPlaylistId: null,
        subscriberCount: null,
        videoCount: null,
        viewCount: null,
        publishedAt: null,
        country: null,
        publicDetails: { platform: 'instagram', source: 'public' },
      },
      posts,
    };
  }
  throw new FinanceValidationError('No public Instagram posts were returned for this page. Connect a professional Instagram account, or check that the username is public.');
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

function facebookPageIdFromHtml(html: string) {
  const patterns = [
    /"pageID":"(\d{5,})"/,
    /"page_id":"(\d{5,})"/,
    /fb:\/\/page\/\?id=(\d{5,})/,
    /content="fb:\/\/page\/(\d{5,})"/,
    /"entity_id":"(\d{5,})"/,
    /profile\.php\?id=(\d{5,})/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function peekPublicInstagram(handle: string) {
  const html = await fetchPublicHtml(`https://www.instagram.com/${encodeURIComponent(handle)}/`, 5000);
  if (!html) return null;
  const title = metaContent(html, 'og:title').replace(/\s*[|·•(@].*$/, '').trim();
  const image = metaContent(html, 'og:image');
  if (!title && !image) return null;
  return { name: title, image: image || null };
}

async function instagramOembed(shortcode: string) {
  try {
    const body = await graphGet('/instagram_oembed', {
      url: `https://www.instagram.com/p/${shortcode}/`,
      omitscript: true,
      maxwidth: 320,
    });
    return {
      thumbnail: String(body.thumbnail_url || ''),
      title: String(body.title || ''),
    };
  } catch {
    return { thumbnail: '', title: '' };
  }
}

async function peekPublicFacebook(handle: string) {
  try {
    const response = await fetch(`https://www.facebook.com/${encodeURIComponent(handle)}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
        signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const title = metaContent(html, 'og:title').replace(/\s*[|·•].*$/, '').trim();
    const image = metaContent(html, 'og:image');
    const pageId = facebookPageIdFromHtml(html);
    if (title && /^(facebook|log in|log into facebook|login)$/i.test(title)) {
      return pageId || image ? { name: '', image: image || null, pageId } : null;
    }
    if (!title && !image && !pageId) return null;
    return { name: title, image: image || null, pageId };
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

export async function listSocialPosts(platform: ResearchPlatform, channel: { youtube_channel_id: string; channel_handle?: string | null; limit?: number; own?: boolean; pageToken?: string | null }) {
  const kind = asPlatform(platform);
  if (kind === 'facebook') return listFacebookPosts(channel.youtube_channel_id, channel.limit ?? 50, channel.channel_handle, channel.own === true, channel.pageToken || '');
  if (kind === 'instagram') {
    const username = String(channel.channel_handle || '').replace(/^@/, '') || channel.youtube_channel_id;
    const listed = await listInstagramPosts(username, channel.limit ?? 50);
    return listed.posts;
  }
  throw new FinanceValidationError('Use Meta Graph for Facebook or Instagram posts.');
}
