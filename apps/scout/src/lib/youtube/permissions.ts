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

const SUBSCRIBER_ROLES = new Set([
  'subscriber_admin',
  'subscriber_user',
  'owner',
  'member',
  'partner',
  'partner_admin',
  'partner_user',
]);

export function isYoutubePermission(value: string): value is YoutubePermission {
  return (YOUTUBE_PERMISSIONS as readonly string[]).includes(value);
}

function canManageYoutubeSettings(role: string | null | undefined) {
  return role === 'SUPER_ADMIN';
}

export function hasYoutubePermission(role: string | null | undefined, grants: readonly string[], key: YoutubePermission) {
  if (key === 'youtube_research.settings.manage') return canManageYoutubeSettings(role);
  if (role === 'SUPER_ADMIN') return true;
  if (SUBSCRIBER_ROLES.has(String(role || ''))) return true;
  return grants.includes(key);
}

export function permissionsForRole(role: string | null | undefined, grants: readonly string[]) {
  if (role === 'SUPER_ADMIN') return [...YOUTUBE_PERMISSIONS];
  if (SUBSCRIBER_ROLES.has(String(role || ''))) {
    return YOUTUBE_PERMISSIONS.filter((key) => key !== 'youtube_research.settings.manage');
  }
  return YOUTUBE_PERMISSIONS.filter((key) => grants.includes(key) && key !== 'youtube_research.settings.manage');
}
