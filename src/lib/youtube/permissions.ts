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

function canManageYoutubeSettings(role: string | null | undefined) {
  return role === 'SUPER_ADMIN';
}

export function hasYoutubePermission(role: string | null | undefined, grants: readonly string[], key: YoutubePermission) {
  if (key === 'youtube_research.settings.manage') return canManageYoutubeSettings(role);
  if (role === 'SUPER_ADMIN') return true;
  if (role === 'partner' || role === 'partner_admin' || role === 'partner_user') {
    return key !== 'youtube_research.settings.manage';
  }
  return grants.includes(key);
}

export function permissionsForRole(role: string | null | undefined, grants: readonly string[]) {
  if (role === 'SUPER_ADMIN') return [...YOUTUBE_PERMISSIONS];
  const allowed = role === 'partner' || role === 'partner_admin' || role === 'partner_user'
    ? YOUTUBE_PERMISSIONS.filter((key) => key !== 'youtube_research.settings.manage')
    : YOUTUBE_PERMISSIONS.filter((key) => grants.includes(key) && key !== 'youtube_research.settings.manage');
  return allowed;
}
