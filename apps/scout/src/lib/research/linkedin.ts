import { FinanceValidationError } from '@/lib/finance/errors';
import type { ResolvedChannel, ResolvedVideo } from '@/lib/youtube/client';
import { searchWikidataPages } from './wiki-pages';

function env(key: string) {
  return process.env[key]?.trim() || '';
}

export function parseLinkedInCompanyInput(input: string) {
  const raw = input.trim();
  if (!raw) throw new FinanceValidationError('Paste a LinkedIn company page URL.');
  if (/linkedin\.com\/in\//i.test(raw)) {
    throw new FinanceValidationError('Use a LinkedIn company page URL, not a personal profile.');
  }
  try {
    const url = new URL(raw.startsWith('http') ? raw : raw.includes('linkedin.com') ? `https://${raw}` : '');
    const host = url.hostname.replace(/^www\./, '');
    if (!host.includes('linkedin.com')) {
      if (/^[A-Za-z0-9-]{2,100}$/.test(raw)) return raw.toLowerCase();
      throw new FinanceValidationError('Use a LinkedIn company page such as linkedin.com/company/your-company.');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const companyIndex = parts.findIndex((part) => part.toLowerCase() === 'company');
    const slug = companyIndex >= 0 ? parts[companyIndex + 1] : '';
    if (!slug) throw new FinanceValidationError('Could not read a company page from that LinkedIn URL.');
    return decodeURIComponent(slug).replace(/\/+$/, '');
  } catch (err) {
    if (err instanceof FinanceValidationError) throw err;
    if (/^[A-Za-z0-9-]{2,100}$/.test(raw)) return raw.toLowerCase();
    throw new FinanceValidationError('Use a LinkedIn company page such as linkedin.com/company/your-company.');
  }
}

function linkedinHeaders() {
  const token = env('LINKEDIN_ACCESS_TOKEN');
  if (!token) {
    throw new FinanceValidationError('LinkedIn is not configured. Set LINKEDIN_ACCESS_TOKEN with Organization lookup permission.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': env('LINKEDIN_API_VERSION') || '202411',
    'X-Restli-Protocol-Version': '2.0.0',
    Accept: 'application/json',
  };
}

async function linkedinGet(path: string) {
  const response = await fetch(`https://api.linkedin.com${path.startsWith('/') ? path : `/${path}`}`, { headers: linkedinHeaders() });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown> & { message?: string; elements?: Record<string, unknown>[] };
  if (!response.ok) {
    throw new FinanceValidationError(body.message || `LinkedIn API returned HTTP ${response.status}`);
  }
  return body;
}

function orgIdFromUrn(urn: string) {
  const match = urn.match(/organization[:\)](\d+)/);
  return match?.[1] || urn;
}

export async function resolveLinkedInPage(input: string): Promise<ResolvedChannel> {
  const vanity = parseLinkedInCompanyInput(input);
  const body = await linkedinGet(`/rest/organizations?q=vanityName&vanityName=${encodeURIComponent(vanity)}`);
  const org = (Array.isArray(body.elements) ? body.elements[0] : body) as Record<string, unknown>;
  const urn = String(org.id || org.organization || '');
  const numeric = orgIdFromUrn(urn);
  if (!numeric) throw new FinanceValidationError('No LinkedIn company page was found for that URL.');
  const name = String(org.localizedName || org.vanityName || vanity);
  const logo = org.logoV2 as { original?: string } | undefined;
  return {
    youtubeChannelId: numeric,
    channelName: name,
    channelHandle: vanity,
    channelUrl: `https://www.linkedin.com/company/${vanity}/`,
    description: String((org.localizedDescription as string) || '') || null,
    thumbnailUrl: logo?.original || null,
    uploadsPlaylistId: null,
    subscriberCount: Number.isFinite(Number(org.followersCount)) ? Number(org.followersCount) : null,
    videoCount: null,
    viewCount: null,
    publishedAt: null,
    country: null,
    publicDetails: { platform: 'linkedin', vanity, urn: urn || `urn:li:organization:${numeric}` },
  };
}

export async function searchLinkedInPages(query: string): Promise<ResolvedChannel[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows: ResolvedChannel[] = [];
  const seen = new Set<string>();
  const push = (item: ResolvedChannel | null) => {
    if (!item?.youtubeChannelId || seen.has(item.youtubeChannelId)) return;
    seen.add(item.youtubeChannelId);
    rows.push(item);
  };
  (await searchWikidataPages('linkedin', q)).forEach(push);
  const slug = q.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (env('LINKEDIN_ACCESS_TOKEN') && /^[A-Za-z0-9-]{2,100}$/.test(slug)) {
    try {
      push(await resolveLinkedInPage(slug));
    } catch {
      /* Vanity name may not exist. */
    }
  }
  if (!env('LINKEDIN_ACCESS_TOKEN')) return rows.slice(0, 20);
  try {
    const body = await linkedinGet('/rest/organizationAcls?q=roleAssignee&count=50');
    const needle = q.toLowerCase();
    for (const item of Array.isArray(body.elements) ? body.elements : []) {
      const org = ((item as { organization?: Record<string, unknown> }).organization
        || (item as { 'organization~'?: Record<string, unknown> })['organization~']
        || {}) as Record<string, unknown>;
      const name = String(org.localizedName || org.vanityName || '');
      const vanity = String(org.vanityName || '');
      if (!name && !vanity) continue;
      if (!`${name} ${vanity}`.toLowerCase().includes(needle)) continue;
      const numeric = orgIdFromUrn(String(org.id || ''));
      if (!numeric) continue;
      push({
        youtubeChannelId: numeric,
        channelName: name || vanity,
        channelHandle: vanity || null,
        channelUrl: vanity ? `https://www.linkedin.com/company/${vanity}/` : `https://www.linkedin.com/company/${numeric}/`,
        description: null,
        thumbnailUrl: (org.logoV2 as { original?: string } | undefined)?.original || null,
        uploadsPlaylistId: null,
        subscriberCount: null,
        videoCount: null,
        viewCount: null,
        publishedAt: null,
        country: null,
        publicDetails: { platform: 'linkedin', vanity },
      });
    }
  } catch {
    /* Token may not list company pages. */
  }
  return rows.slice(0, 20);
}

export async function listLinkedInPosts(organizationId: string, limit = 50): Promise<ResolvedVideo[]> {
  const author = encodeURIComponent(`urn:li:organization:${organizationId}`);
  const body = await linkedinGet(`/rest/posts?q=author&author=${author}&count=${Math.min(50, Math.max(1, limit))}`);
  const elements = Array.isArray(body.elements) ? body.elements : [];
  return elements.map((post) => {
    const id = String(post.id || '');
    const commentary = String((post.commentary as string) || '').trim();
    return {
      youtubeVideoId: `linkedin:${id}`,
      youtubeChannelId: organizationId,
      channelTitle: null,
      title: commentary ? commentary.slice(0, 120) : 'LinkedIn post',
      description: commentary || null,
      publishedAt: post.createdAt ? new Date(Number(post.createdAt)).toISOString() : null,
      duration: null,
      thumbnailUrl: null,
      viewCount: null,
      likeCount: null,
      commentCount: null,
      tags: [],
      categoryId: null,
      defaultLanguage: null,
      defaultAudioLanguage: null,
      hasPaidProductPlacement: null,
      publicDetails: { platform: 'linkedin', permalink: post.id },
    } satisfies ResolvedVideo;
  });
}
