'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { currentProjectId, rememberProject, youtubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

export default function YoutubeResearchNav() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const base = youtubePageBase(pathname);
  const inYoutube = pathname.startsWith(base);
  const onDashboard = pathname === base || pathname === `${base}/`;
  const [projects, setProjects] = useState<{ id: string; name: string }[] | null>(null);
  const [open, setOpen] = useState(true);
  const [currentId, setCurrentId] = useState('');

  useEffect(() => {
    yt('projects?status=active&page=1&pageSize=50')
      .then((body) => setProjects((body.rows || []).map((row: { id: string; name: string }) => ({ id: row.id, name: row.name }))))
      .catch(() => setProjects([]));
    setCurrentId(currentProjectId());
    setOpen(true);
  }, [pathname]);

  const openProject = (id: string) => {
    rememberProject(id);
    setCurrentId(id);
    setOpen(true);
    router.push(`${base}/channels`);
  };

  const itemClass = (active: boolean) =>
    `side-nav-item block rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-orange-100 font-medium text-secondary' : 'text-slate-500 hover:bg-orange-50/70 hover:text-secondary'}`;

  return (
    <div className="mt-1 space-y-0.5">
      <Link href={base} className={itemClass(onDashboard)}>
        Dashboard
      </Link>
      <button type="button" className="side-nav-item block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium text-slate-600 hover:bg-orange-50/70 hover:text-secondary" onClick={() => setOpen((value) => !value)}>
        Projects
      </button>
      {open ? (
        <div className="ml-2 space-y-0.5 border-l border-slate-100 pl-2">
          {projects === null ? (
            <p className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-secondary" /> Loading projects…</p>
          ) : projects.length ? projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`${itemClass(currentId === project.id && !onDashboard)} w-full truncate text-left`}
              onClick={() => openProject(project.id)}
            >
              {project.name}
            </button>
          )) : (
            <p className="px-3 py-1.5 text-xs text-slate-400">No projects yet</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
