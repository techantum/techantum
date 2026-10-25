'use client';

import { formatAgo, setupLabel, type HomeProject } from '@/lib/youtube/home-display';

export const PROJECT_AVATARS = ['bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700'];

export function ProjectProgress({ project }: { project: HomeProject }) {
  const done = project.status === 'archived' || project.next.key === 'ready';
  return (
    <div>
      <p className={`mb-1 text-[11px] ${done ? 'text-emerald-700' : 'text-slate-500'}`}>{setupLabel(project)}</p>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <span key={step} className={`h-1.5 w-5 rounded-full ${step <= project.next.progress ? (done ? 'bg-emerald-500' : 'bg-secondary') : 'bg-slate-200'}`} />
        ))}
      </div>
    </div>
  );
}

export function ChannelStack({ project, index = 0 }: { project: HomeProject; index?: number }) {
  const extra = Math.max(0, project.competitor_count - Math.min(2, (project.competitor_avatars || []).length));
  if (!project.own_thumbnail_url && !project.competitor_count) {
    return <span className="text-xs text-slate-400">No channels yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex -space-x-1.5">
        {project.own_thumbnail_url
          ? <img src={project.own_thumbnail_url} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
          : <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ${PROJECT_AVATARS[index % PROJECT_AVATARS.length]}`}>{project.initials}</span>}
        {(project.competitor_avatars || []).slice(0, 2).map((avatar) => (
          avatar.thumbnail_url
            ? <img key={avatar.name} src={avatar.thumbnail_url} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />
            : <span key={avatar.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-600">{avatar.name.slice(0, 2).toUpperCase()}</span>
        ))}
        {extra > 0 ? <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-600">+{extra}</span> : null}
      </span>
      {project.competitor_count ? <span className="text-xs text-slate-500">{project.competitor_count} comp.</span> : null}
    </span>
  );
}

export { formatAgo };
