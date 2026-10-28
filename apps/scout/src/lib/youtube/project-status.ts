export const PROJECT_STATUSES = ['todo', 'active', 'completed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  todo: 'To Do',
  active: 'In Progress',
  completed: 'Completed',
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  todo: 'bg-amber-50 text-amber-700',
  active: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

export function asProjectStatus(value: unknown): ProjectStatus {
  const status = String(value || 'todo');
  if (status === 'archived') return 'completed';
  if (status === 'setup') return 'todo';
  if (PROJECT_STATUSES.includes(status as ProjectStatus)) return status as ProjectStatus;
  return 'todo';
}

export function lifecycleStatus(row: {
  status?: string | null;
  own_youtube_channel_id?: string | null;
  video_count?: number;
  analysis_count?: number;
}): ProjectStatus {
  const stored = asProjectStatus(row.status);
  if (stored === 'completed') return 'completed';
  if (!row.own_youtube_channel_id) return 'todo';
  if (stored === 'todo' && Number(row.video_count || 0) > 0) return 'active';
  return stored === 'todo' ? 'todo' : 'active';
}
