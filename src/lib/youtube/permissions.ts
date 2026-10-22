export const YOUTUBE_PERMISSIONS = [
  'youtube_research.view',
  'youtube_research.channels.manage',
  'youtube_research.videos.import',
  'youtube_research.videos.refresh',
  'youtube_research.research.edit',
  'youtube_research.analytics.view',
  'youtube_research.competitors.view',
  'youtube_research.reports.export',
  'youtube_research.settings.manage',
] as const;

export type YoutubePermission = (typeof YOUTUBE_PERMISSIONS)[number];

export function isYoutubePermission(value: string): value is YoutubePermission {
  return (YOUTUBE_PERMISSIONS as readonly string[]).includes(value);
}

export function hasYoutubePermission(role: string | null | undefined, grants: readonly string[], key: YoutubePermission) {
  if (role === 'SUPER_ADMIN') return true;
  return grants.includes(key);
}

export function permissionsForRole(role: string | null | undefined, grants: readonly string[]) {
  if (role === 'SUPER_ADMIN') return [...YOUTUBE_PERMISSIONS];
  return YOUTUBE_PERMISSIONS.filter((key) => grants.includes(key));
}
