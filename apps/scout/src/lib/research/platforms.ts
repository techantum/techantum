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
