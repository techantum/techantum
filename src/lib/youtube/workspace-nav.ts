export const YOUTUBE_PROJECT_PAGES = [
  { suffix: '/videos', label: 'Research', section: 'videos', icon: 'PlayCircleIcon' },
  { suffix: '/channel-compare', label: 'Analysis', section: 'channel-compare', icon: 'ChartBarIcon' },
  { suffix: '/reports', label: 'Reports', section: 'reports', icon: 'DocumentChartBarIcon' },
] as const;

export const YOUTUBE_TAB_HINT: Record<string, string> = {
  videos: 'Content from your channels and competitors on YouTube.',
  channels: 'Add your YouTube channel and competitors, then return to Research.',
  'channel-compare': 'Analysed videos from this project. Open a row for stats, goal gaps, and suggestions.',
  analysis: 'Open a saved analysis or run a custom AI analysis.',
  reports: 'Open a saved comparison or download it as a report.',
};

export const MAX_PROJECT_COMPETITORS = 5;

export function youtubeWorkspaceTab(section: string) {
  if (['videos', 'import', 'channels'].includes(section)) return 'videos';
  if (['compare', 'channel-compare', 'overview', 'analysis'].includes(section)) return 'channel-compare';
  if (section === 'reports') return 'reports';
  return section;
}

export function youtubeNestedLabel(section: string) {
  if (section === 'channels') return 'Channel management';
  if (section === 'import') return 'Import videos';
  if (section === 'compare') return 'Video comparison';
  return '';
}
