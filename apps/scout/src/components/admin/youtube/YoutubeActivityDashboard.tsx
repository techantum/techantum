'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { ChannelStack, ProjectStatusBadge } from '@/components/admin/youtube/ProjectMarks';
import { rememberProject, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import Icon from '@/components/ui/AppIcon';
import { firstNameFrom, greetingForHour, type HomeProject } from '@/lib/youtube/home-display';

const RANGES = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function YoutubeActivityDashboard({
  initialHome = null,
  initialFirstName = 'there',
  initialManage = false,
}: {
  initialHome?: Record<string, any> | null;
  initialFirstName?: string;
  initialManage?: boolean;
}) {
  const router = useRouter();
  const base = useYoutubePageBase();
  const [manage, setManage] = useState(initialManage);
  const [home, setHome] = useState<Record<string, any> | null>(initialHome);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [range, setRange] = useState('30');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!initialHome);

  useEffect(() => {
    if (initialHome) {
      yt('session')
        .then((session) => {
          if (session.firstName) setFirstName(session.firstName);
          else if (session.name || session.email) setFirstName(firstNameFrom(session.name, session.email));
          if (Array.isArray(session.permissions)) setManage(session.permissions.includes('youtube_research.channels.manage'));
        })
        .catch(() => undefined);
      return;
    }
    Promise.all([yt('home'), yt('session').catch(() => ({}))])
      .then(([body, session]) => {
        setHome(body);
        if (session.firstName) setFirstName(session.firstName);
        else setFirstName(firstNameFrom(session.name, session.email));
        setManage(Array.isArray(session.permissions) && session.permissions.includes('youtube_research.channels.manage'));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [initialHome]);

  const stats = home?.stats || {};
  const projects: HomeProject[] = home?.projects || [];
  const team = home?.team || [];
  const since = Date.now() - Number(range) * 86400000;
  const recent = useMemo(
    () => projects.filter((row) => !row.updated_at || new Date(row.updated_at).getTime() >= since).slice(0, 6),
    [projects, since],
  );

  const todo = Number(stats.todoProjects || 0);
  const active = Number(stats.activeProjects || 0);
  const completed = Number(stats.completedProjects || 0);
  const total = Number(stats.totalProjects || todo + active + completed);

  const open = (project: HomeProject) => {
    rememberProject(project.id);
    router.push(`${base}/videos`);
  };

  if (loading) return <PageLoader label="Loading dashboard…" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{greetingForHour()}, {firstName}</h1>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <Icon name="CalendarDaysIcon" size={16} />
          <select className="bg-transparent outline-none" value={range} onChange={(event) => setRange(event.target.value)}>
            {RANGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Projects', value: total, hint: `+${projects.filter((row) => new Date(row.updated_at).getTime() >= Date.now() - 30 * 86400000).length} this month`, icon: 'FolderIcon', tone: 'from-violet-50 to-white', iconBg: 'bg-violet-100 text-violet-600' },
          { label: 'To Do', value: todo, hint: total ? `${Math.round((todo / total) * 100)}% of total` : '0% of total', icon: 'PlayCircleIcon', tone: 'from-sky-50 to-white', iconBg: 'bg-sky-100 text-sky-600' },
          { label: 'In Progress', value: active, hint: total ? `${Math.round((active / total) * 100)}% of total` : '0% of total', icon: 'BoltIcon', tone: 'from-amber-50 to-white', iconBg: 'bg-amber-100 text-amber-600' },
          { label: 'Completed', value: completed, hint: total ? `${Math.round((completed / total) * 100)}% of total` : '0% of total', icon: 'CheckCircleIcon', tone: 'from-emerald-50 to-white', iconBg: 'bg-emerald-100 text-emerald-600' },
        ].map((card) => (
          <article key={card.label} className={`rounded-3xl border border-slate-100 bg-gradient-to-br ${card.tone} p-5 shadow-sm`}>
            <div className="flex items-start justify-between">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg}`}>
                <Icon name={card.icon} size={20} />
              </span>
              <Icon name="ChevronRightIcon" size={16} className="text-slate-300" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">{card.label}</p>
            <p className="font-bricolage text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {[
          { href: `${base}/quick-analysis`, title: 'Quick Analysis', copy: 'Compare multiple YouTube videos instantly without creating a project.', icon: 'BoltIcon', tint: 'bg-rose-50 text-rose-500' },
          { href: `${base}/quick-reports`, title: 'Quick Report', copy: 'Generate and download a comparison report from selected videos.', icon: 'DocumentChartBarIcon', tint: 'bg-sky-50 text-sky-600' },
          { href: `${base}/projects/new`, title: 'New Project', copy: 'Create a research project to analyse your own channel.', icon: 'PlusIcon', tint: 'bg-violet-50 text-violet-600', hide: !manage },
        ].filter((item) => !item.hide).map((item) => (
          <Link key={item.title} href={item.href} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-violet-200">
            <span className="flex min-w-0 items-start gap-3">
              <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.tint}`}>
                <Icon name={item.icon} size={18} />
              </span>
              <span>
                <span className="block font-bricolage text-lg font-semibold text-slate-900">{item.title}</span>
                <span className="mt-1 block text-sm text-slate-500">{item.copy}</span>
              </span>
            </span>
            <Icon name="ChevronRightIcon" size={18} className="text-slate-300" />
          </Link>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-bricolage text-lg font-semibold text-slate-900">Recent Projects</h2>
            <Link href={`${base}/projects`} className="text-sm font-semibold text-violet-600">View all projects</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2">Project name</th>
                  <th className="px-5 py-2">Channels</th>
                  <th className="px-5 py-2">Videos</th>
                  <th className="px-5 py-2">Status</th>
                  <th className="px-5 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((project) => (
                  <tr key={project.id} className="border-t border-slate-50">
                    <td className="px-5 py-3">
                      <button type="button" className="flex items-center gap-2 text-left font-semibold text-slate-800" onClick={() => open(project)}>
                        <ChannelStack project={project} />
                        <span className="truncate">{project.name}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3">{1 + Number(project.competitor_count || 0)}</td>
                    <td className="px-5 py-3">{project.video_count}</td>
                    <td className="px-5 py-3"><ProjectStatusBadge status={project.status} /></td>
                    <td className="px-5 py-3">
                      <button type="button" className="font-semibold text-violet-600" onClick={() => open(project)}>View</button>
                    </td>
                  </tr>
                ))}
                {!recent.length ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No projects in this range yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="inline-flex items-center gap-2 font-bricolage text-lg font-semibold text-slate-900">
              <Icon name="UserGroupIcon" size={18} className="text-violet-500" /> Team Members
            </h2>
            <div className="flex items-center gap-2">
              <Link href="/team" className="text-sm font-semibold text-violet-600">View all</Link>
              <Link href="/team" className="btn-primary btn-sm">+ Create Team</Link>
            </div>
          </div>
          <ul>
            {team.length ? team.map((member: { user_id: string; name: string; role: string; active?: boolean }) => (
              <li key={member.user_id} className="flex items-center gap-3 border-t border-slate-50 px-5 py-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials(member.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800">{member.name}</span>
                  <span className="text-xs text-slate-400">{member.role === 'subscriber_admin' ? 'Admin' : 'Analyst'}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${member.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{member.active !== false ? 'Active' : 'Inactive'}</span>
                <Link href="/team" className="text-sm font-semibold text-violet-600">View</Link>
              </li>
            )) : (
              <li className="px-5 py-10 text-center text-sm text-slate-500">Invite people from Team to see them here.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
