import { platformCopy, researchContentSuffix, titleCase } from '@/lib/research/platforms';

export const YOUTUBE_PROJECT_PAGES = [
  { suffix: '/videos', label: 'Research', section: 'videos', icon: 'PlayCircleIcon' },
  { suffix: '/channel-compare', label: 'Analysis', section: 'channel-compare', icon: 'ChartBarIcon' },
  { suffix: '/reports', label: 'Reports', section: 'reports', icon: 'DocumentChartBarIcon' },
] as const;

export function researchProjectPages(platform: unknown) {
  return [
    { suffix: researchContentSuffix(platform), label: 'Research', section: 'videos', icon: 'PlayCircleIcon' },
    { suffix: '/channel-compare', label: 'Analysis', section: 'channel-compare', icon: 'ChartBarIcon' },
    { suffix: '/reports', label: 'Reports', section: 'reports', icon: 'DocumentChartBarIcon' },
  ] as const;
}

export const YOUTUBE_TAB_HINT: Record<string, string> = {
  videos: 'Competition Research',
  channels: 'Add your channel or page and competitors, then return to Research.',
  'channel-compare': 'Analysed videos from this project. Open a row for stats, goal gaps, and suggestions.',
  analysis: 'Open a saved analysis or run a custom AI analysis.',
  reports: 'Open a saved comparison or download it as a report.',
};

export const MAX_PROJECT_COMPETITORS = 5;

export function youtubeWorkspaceTab(section: string) {
  if (['videos', 'posts', 'import', 'channels'].includes(section)) return 'videos';
  if (['compare', 'channel-compare', 'overview', 'analysis'].includes(section)) return 'channel-compare';
  if (section === 'reports') return 'reports';
  return section;
}

export function youtubeNestedLabel(section: string, platform?: unknown) {
  const copy = platformCopy(platform);
  if (section === 'channels') return `${titleCase(copy.entity)} management`;
  if (section === 'import') return copy.id === 'youtube' ? 'Import videos' : 'Import posts';
  if (section === 'compare') return copy.id === 'youtube' ? 'Video comparison' : 'Post comparison';
  return '';
}
