export type ProjectNextStep = {
  key: 'own' | 'competitors' | 'import' | 'analysis' | 'report' | 'ready';
  label: string;
  href: string;
  action: string | null;
  progress: number;
};

export type CompetitorAvatar = { name: string; thumbnail_url: string | null };

export type HomeProject = {
  id: string;
  name: string;
  brand_name: string | null;
  industry: string | null;
  status: string;
  legacy?: boolean;
  updated_at: string;
  platform?: string;
  own_channel_name: string | null;
  own_thumbnail_url: string | null;
  competitor_count: number;
  competitor_avatars: CompetitorAvatar[];
  video_count: number;
  analysis_count: number;
  report_count: number;
  next: ProjectNextStep;
  initials: string;
};

export function greetingForHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstNameFrom(full?: string | null, email?: string | null) {
  const fromFull = String(full || '').trim().split(/\s+/)[0];
  if (fromFull) return fromFull;
  const local = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!local) return 'there';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function projectInitials(name: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'PR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatAgo(value: string | Date | null | undefined) {
  if (!value) return '';
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function nextStepFor(row: {
  status?: string | null;
  platform?: string | null;
  own_youtube_channel_id?: string | null;
  competitor_count?: number;
  video_count?: number;
  analysis_count?: number;
  report_count?: number;
}): ProjectNextStep {
  if (row.status === 'completed' || row.status === 'archived') {
    return { key: 'ready', label: 'Completed', href: `/videos`, action: null, progress: 6 };
  }
  const page = String(row.platform || 'youtube') !== 'youtube';
  if (!row.own_youtube_channel_id) {
    return { key: 'own', label: page ? 'Connect your page' : 'Connect your channel', href: `/channels?from=research&add=own`, action: 'Connect', progress: 1 };
  }
  if (Number(row.competitor_count || 0) < 1) {
    return { key: 'competitors', label: page ? 'Add competitor pages' : 'Add competitors', href: `/channels?from=research&add=competitor`, action: 'Add', progress: 2 };
  }
  if (Number(row.video_count || 0) < 1) {
    return { key: 'import', label: page ? 'Import posts' : 'Import videos', href: `/videos`, action: 'Import', progress: 3 };
  }
  if (Number(row.analysis_count || 0) < 1) {
    return { key: 'analysis', label: 'Run analysis', href: `/videos`, action: 'Analyse', progress: 4 };
  }
  if (Number(row.report_count || 0) < 1) {
    return { key: 'report', label: 'Generate report', href: `/videos`, action: 'Generate', progress: 5 };
  }
  return { key: 'ready', label: 'Research', href: `/videos`, action: null, progress: 6 };
}

export function presentListedProject(row: Record<string, any>): HomeProject {
  const avatars = Array.isArray(row.competitor_avatars)
    ? row.competitor_avatars.map((item: { name?: string; thumbnail_url?: string }) => ({
        name: item.name || 'Competitor',
        thumbnail_url: item.thumbnail_url || null,
      }))
    : [];
  return {
    id: String(row.id),
    name: row.name,
    platform: row.platform || 'youtube',
    brand_name: row.brand_name || null,
    industry: row.industry || null,
    status: row.status === 'archived' ? 'completed' : row.status,
    legacy: Boolean(row.legacy),
    updated_at: String(row.updated_at || ''),
    own_channel_name: row.own_channel_name || null,
    own_thumbnail_url: row.own_thumbnail_url || null,
    competitor_count: Number(row.competitor_count || 0),
    competitor_avatars: avatars,
    video_count: Number(row.video_count || 0),
    analysis_count: Number(row.analysis_count || 0),
    report_count: Number(row.report_count || 0),
    next: nextStepFor(row),
    initials: projectInitials(row.name),
  };
}

export function setupLabel(project: Pick<HomeProject, 'next' | 'status'>) {
  if (project.status === 'completed' || project.status === 'archived') return '✓ Completed';
  if (project.next.key === 'ready') return '✓ Report ready';
  return `Next: ${project.next.label}`;
}
