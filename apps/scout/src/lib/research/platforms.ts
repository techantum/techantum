import { parseYoutubeVideoIds } from '@/lib/youtube/parse';

export const RESEARCH_PLATFORMS = ['youtube', 'facebook', 'instagram', 'linkedin'] as const;

export type ResearchPlatform = (typeof RESEARCH_PLATFORMS)[number];

export type PlatformCopy = {
  id: ResearchPlatform;
  label: string;
  entity: 'channel' | 'page';
  entityPlural: string;
  content: 'video' | 'post';
  contentPlural: string;
  fetchLabel: string;
  ownLabel: string;
  competitorLabel: string;
  placeholder: string;
  hint: string;
  accent: string;
  mark: string;
  markClass: string;
};

export const PLATFORM_COPY: Record<ResearchPlatform, PlatformCopy> = {
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    entity: 'channel',
    entityPlural: 'channels',
    content: 'video',
    contentPlural: 'videos',
    fetchLabel: 'Fetch videos',
    ownLabel: 'Your YouTube channel',
    competitorLabel: 'Competitor channels',
    placeholder: 'YouTube channel name or @handle',
    hint: 'Start typing a channel name, then select it from the list.',
    accent: 'bg-red-50 text-slate-900',
    mark: '▶',
    markClass: 'bg-[#FF0000] text-white',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    entity: 'page',
    entityPlural: 'pages',
    content: 'post',
    contentPlural: 'posts',
    fetchLabel: 'Fetch posts',
    ownLabel: 'Your Facebook page',
    competitorLabel: 'Competitor pages',
    placeholder: 'Facebook page name',
    hint: 'Start typing a page name, then select it from the list. Personal profiles are not supported.',
    accent: 'bg-sky-50 text-sky-900',
    mark: 'f',
    markClass: 'bg-[#1877F2] text-white',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    entity: 'page',
    entityPlural: 'pages',
    content: 'post',
    contentPlural: 'posts',
    fetchLabel: 'Fetch posts',
    ownLabel: 'Your Instagram page',
    competitorLabel: 'Competitor pages',
    placeholder: 'Instagram page name or @username',
    hint: 'Start typing a page name or @username, then select it from the list.',
    accent: 'bg-fuchsia-50 text-fuchsia-900',
    mark: '◎',
    markClass: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    entity: 'page',
    entityPlural: 'pages',
    content: 'post',
    contentPlural: 'posts',
    fetchLabel: 'Fetch posts',
    ownLabel: 'Your LinkedIn page',
    competitorLabel: 'Competitor pages',
    placeholder: 'LinkedIn company page name',
    hint: 'Start typing a company page name, then select it from the list. Personal profiles are not supported.',
    accent: 'bg-blue-50 text-blue-900',
    mark: 'in',
    markClass: 'bg-[#0A66C2] text-white',
  },
};

export function asPlatform(value: unknown): ResearchPlatform {
  const raw = String(value || 'youtube').trim().toLowerCase();
  return (RESEARCH_PLATFORMS as readonly string[]).includes(raw) ? (raw as ResearchPlatform) : 'youtube';
}

export function platformCopy(value: unknown): PlatformCopy {
  return PLATFORM_COPY[asPlatform(value)];
}

export type ContentLink = { id: string; url: string; handle: string };

export function contentUrlPlaceholder(platform: unknown) {
  const kind = asPlatform(platform);
  if (kind === 'facebook') return 'https://www.facebook.com/yourpage/posts/…';
  if (kind === 'instagram') return 'https://www.instagram.com/p/…';
  if (kind === 'linkedin') return 'https://www.linkedin.com/posts/…';
  return 'https://www.youtube.com/watch?v=…';
}

export function parseContentLinks(platform: unknown, raw: string): ContentLink[] {
  const kind = asPlatform(platform);
  const found: ContentLink[] = [];
  const seen = new Set<string>();
  const take = (id: string, url: string, handle = '') => {
    const key = String(id || '').replace(/\/+$/, '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    found.push({ id: key, url, handle: handle.replace(/^@/, '') });
  };
  if (kind === 'youtube') {
    for (const id of parseYoutubeVideoIds(raw)) take(id, `https://www.youtube.com/watch?v=${id}`);
    return found;
  }
  const tokens = String(raw || '').split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
  for (const token of tokens) {
    try {
      const href = /^https?:\/\//i.test(token) ? token : `https://${token}`;
      const parsed = new URL(href);
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '').replace(/^web\./, '');
      const parts = parsed.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
      if (kind === 'instagram') {
        if (!host.includes('instagram.com')) continue;
        const index = parts.findIndex((part) => ['p', 'reel', 'reels', 'tv'].includes(part.toLowerCase()));
        if (index < 0 || !parts[index + 1]) continue;
        take(parts[index + 1], parsed.toString(), index > 0 ? parts[0] : '');
      } else if (kind === 'facebook') {
        if (!host.includes('facebook.com') && !host.includes('fb.com')) continue;
        const story = parsed.searchParams.get('story_fbid') || parsed.searchParams.get('fbid') || parsed.searchParams.get('v') || '';
        const kindIndex = parts.findIndex((part) => ['posts', 'videos', 'photos', 'reel', 'reels', 'watch'].includes(part.toLowerCase()));
        const shareId = parts[0] === 'share' ? parts[2] || parts[1] : '';
        const id = (kindIndex >= 0 ? parts[kindIndex + 1] : '') || shareId || story;
        if (!id) continue;
        const skip = new Set(['posts', 'videos', 'photos', 'reel', 'reels', 'watch', 'share', 'permalink.php', 'photo.php', 'story.php']);
        const handle = kindIndex > 0 && !skip.has(parts[0].toLowerCase()) ? parts[0] : '';
        take(id, parsed.toString(), handle);
      } else if (kind === 'linkedin') {
        if (!host.includes('linkedin.com')) continue;
        if (parts[0] === 'posts' && parts[1]) take(parts[1], parsed.toString(), parts[1].split('_')[0] || '');
        else if (parts[0] === 'feed' && parts[1] === 'update' && parts[2]) take(parts[2], parsed.toString());
      }
    } catch {
      /* Skip tokens that are not URLs for this platform. */
    }
  }
  return found;
}

export function contentCountLabel(copy: PlatformCopy, count: number) {
  return `${count} ${count === 1 ? copy.content : copy.contentPlural}`;
}

export function fetchLoaderMessage(copy: PlatformCopy) {
  return `Fetching ${copy.contentPlural} from ${copy.label}…`;
}

export function fetchSuccessMessage(copy: PlatformCopy, count: number) {
  if (count) return `Fetched ${contentCountLabel(copy, count)} from ${copy.label}.`;
  return `No new public ${copy.contentPlural} were returned for these ${copy.entityPlural}.`;
}

export function fetchBusyMessage(copy: PlatformCopy) {
  const noun = copy.content === 'video' ? 'Videos' : 'Posts';
  return `${noun} are still being fetched from these ${copy.entityPlural}…`;
}

export function fetchOverlayTitle(copy: PlatformCopy) {
  return `Please wait while we fetch the ${copy.contentPlural}`;
}

export function fetchOverlaySteps(copy: PlatformCopy) {
  return [
    `Opening your ${copy.label} ${copy.entityPlural}`,
    `Pulling public ${copy.contentPlural}`,
    'Collecting titles, media and metrics',
    'Dropping them into this project',
  ];
}

export function fetchOverlayEyebrow(copy: PlatformCopy) {
  return `${copy.label} research`;
}

export function fetchOverlayBoxLabel(copy: PlatformCopy) {
  return copy.content === 'video' ? 'VIDEO BOX' : 'POST BOX';
}

export function fetchOverlayNote(copy: PlatformCopy) {
  return `This can take a minute for busy ${copy.entityPlural}.`;
}

export function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export const FACEBOOK_CONTENT_FILTERS = [
  { id: 'post', label: 'General post' },
  { id: 'photo', label: 'Photo' },
  { id: 'video', label: 'Video' },
  { id: 'reel', label: 'Reel' },
  { id: 'link', label: 'Link' },
  { id: 'ad', label: 'Ad' },
  { id: 'boosted', label: 'Boosted' },
] as const;

export const POST_FORMAT_FILTERS = [
  { id: 'post', label: 'General post' },
  { id: 'photo', label: 'Photo' },
  { id: 'video', label: 'Video' },
  { id: 'reel', label: 'Reel' },
  { id: 'link', label: 'Link' },
] as const;

export const AD_FORMAT_FILTERS = [
  { id: 'ad', label: 'Ad' },
  { id: 'boosted', label: 'Boosted' },
] as const;

export const FACEBOOK_PLACEMENT_FILTERS = [
  { id: 'organic', label: 'Organic' },
  { id: 'paid', label: 'Paid' },
] as const;

export function splitFetchMessage(copy: PlatformCopy, posts: number, ads: number) {
  if (posts && ads) return `Fetched ${posts} ${posts === 1 ? (copy.content === 'video' ? 'video' : 'post') : copy.contentPlural} and ${ads} ${ads === 1 ? 'ad' : 'ads'} from ${copy.label}.`;
  if (ads && !posts) return `Fetched ${ads} ${ads === 1 ? 'ad' : 'ads'} from ${copy.label}.`;
  return fetchSuccessMessage(copy, posts);
}

export function facebookPageConnectHref(projectId: string, returnPath = '/facebook/posts') {
  const params = new URLSearchParams({ projectId, return: returnPath });
  return `/api/youtube/meta/facebook/start?${params.toString()}`;
}

export function isResearchPlatformSlug(value: string) {
  return (RESEARCH_PLATFORMS as readonly string[]).includes(value);
}

export function researchPageBase(platform: unknown) {
  return `/${asPlatform(platform)}`;
}

export function researchPageBaseFromPath(pathname: string) {
  const first = String(pathname || '').split('/').filter(Boolean)[0] || '';
  return isResearchPlatformSlug(first) ? `/${first}` : '/youtube';
}

export function researchContentSuffix(platform: unknown) {
  return asPlatform(platform) === 'youtube' ? '/videos' : '/posts';
}

export function researchContentHref(baseOrPlatform: unknown, query = '') {
  const raw = String(baseOrPlatform || 'youtube');
  const platform = asPlatform(raw.replace(/^\//, '').split('/')[0]);
  const extra = query && !query.startsWith('?') ? `?${query}` : query;
  return `${researchPageBase(platform)}${researchContentSuffix(platform)}${extra}`;
}

export function researchOpenHref(platform: unknown, query = '') {
  return researchContentHref(platform, query);
}

export function canonicalizeResearchPath(pathname: string, platform: unknown, search = '') {
  if (pathname === '/projects' || pathname.startsWith('/projects/')) return null;
  const currentBase = researchPageBaseFromPath(pathname);
  const expectedBase = researchPageBase(platform);
  const rest = pathname.slice(currentBase.length) || '';
  const query = search ? (search.startsWith('?') ? search : `?${search}`) : '';
  let nextRest = rest;
  if (rest === '/videos' || rest === '/posts') nextRest = researchContentSuffix(platform);
  const next = `${expectedBase}${nextRest}${query}`;
  const current = `${pathname}${query}`;
  return next === current ? null : next;
}
