'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { ChannelStack, PROJECT_AVATARS, ProjectProgress, formatAgo } from '@/components/admin/youtube/ProjectMarks';
import { allow, rememberProject, useYoutubeAccess, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import { usePartnerAccess } from '@/components/partner/PartnerShell';
import Icon from '@/components/ui/AppIcon';
import { firstNameFrom, greetingForHour, type HomeProject } from '@/lib/youtube/home-display';

const IMPORT_RANGES = [
  { id: 'daily', label: 'Daily', hint: 'Last 14 days' },
  { id: 'weekly', label: 'Weekly', hint: 'Last 8 weeks' },
  { id: 'monthly', label: 'Monthly', hint: 'Last 12 months' },
] as const;

function activityLine(row: { action?: string; actor_name?: string; project_name?: string; channel_name?: string }) {
  const name = row.actor_name || 'Someone';
  const action = String(row.action || '');
  const project = row.project_name ? ` ${row.project_name}` : '';
  const channel = row.channel_name || '';
  if (/Report Deleted/i.test(action)) return `${name} deleted a report${project}`;
  if (/Report Created/i.test(action)) return `${name} generated ${row.project_name || 'a report'}`;
  if (/Analysis Created/i.test(action)) return `${name} ran AI analysis${project ? ` on${project}` : ''}`;
  if (/Project Created/i.test(action)) return `${name} created${project || ' a project'}`;
  if (/Channel/i.test(action)) return channel ? `${name} added ${channel}${project ? ` to${project}` : ''}` : `${name} updated a channel${project}`;
  return `${name} ${action.replace(/^YouTube /i, '').toLowerCase()}`;
}

function attentionIcon(title: string) {
  if (/competitor/i.test(title)) return { icon: 'UserPlusIcon', tint: 'bg-rose-50 text-rose-500' };
  if (/import/i.test(title)) return { icon: 'PlayCircleIcon', tint: 'bg-orange-50 text-secondary' };
  if (/connect/i.test(title)) return { icon: 'PlusIcon', tint: 'bg-slate-100 text-slate-600' };
  if (/analys/i.test(title)) return { icon: 'LightBulbIcon', tint: 'bg-amber-50 text-amber-600' };
  return { icon: 'DocumentChartBarIcon', tint: 'bg-emerald-50 text-emerald-600' };
}

function reportKind(type: string) {
  if (type === 'link') return 'LINK';
  return 'PDF';
}

function projectPath(base: string, suffix: string) {
  return `${base}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

const BAR_TONES = [
  'from-violet-500 to-fuchsia-400',
  'from-sky-500 to-cyan-400',
  'from-rose-500 to-orange-400',
  'from-amber-400 to-yellow-300',
  'from-emerald-500 to-teal-400',
];

function MotionIcon({ name, className, delay = 0 }: { name: string; className?: string; delay?: number }) {
  return (
    <span className={`inline-flex ${className || ''}`} style={{ animation: `yt-bob 2.4s ease-in-out ${delay}ms infinite` }}>
      <Icon name={name} size={18} />
    </span>
  );
}

export default function ResearchProjectsPage() {
  const router = useRouter();
  const base = useYoutubePageBase();
  const access = useYoutubeAccess();
  const partner = usePartnerAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [home, setHome] = useState<Record<string, any> | null>(null);
  const [firstName, setFirstName] = useState(firstNameFrom(partner?.partnerUser.full_name, partner?.partnerUser.email));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [importRange, setImportRange] = useState<(typeof IMPORT_RANGES)[number]['id']>('weekly');

  const loadHome = async () => {
    const [body, session] = await Promise.all([yt('home'), yt('session').catch(() => ({}))]);
    setHome(body);
    if (session.firstName) setFirstName(session.firstName);
  };

  useEffect(() => {
    loadHome().catch((err) => setError(err.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (projectId: string, suffix = '/videos') => {
    rememberProject(projectId);
    router.push(`${base}${suffix.startsWith('/') ? suffix : `/${suffix}`}`);
  };

  const openProject = (projectId: string) => go(projectId, '/videos');

  const greeting = `${greetingForHour()}, ${firstName}`;
  const stats = home?.stats || {};
  const projects: HomeProject[] = home?.projects || [];
  const resume = home?.resume as HomeProject | null;
  const importSeries: { key?: string; week?: string; label: string; count: number }[] =
    home?.imports?.[importRange]
    || (importRange === 'weekly' ? home?.weeks : [])
    || [];
  const weekMax = Math.max(1, ...importSeries.map((row) => row.count));
  const importMeta = IMPORT_RANGES.find((item) => item.id === importRange);
  const competitorProject = projects.find((project) => project.next.key === 'competitors') || resume;
  const analysisProject = projects.find((project) => project.next.key === 'analysis') || projects.find((project) => project.video_count > 0);
  const reportProject = projects.find((project) => project.next.key === 'report' || project.next.key === 'ready') || resume;

  const quick = useMemo(() => [
    { label: 'New project', hint: 'Benchmark a channel', href: `${base}/projects/new`, icon: 'PlusIcon', tint: 'bg-rose-50 text-rose-600', show: manage, projectId: '' },
    { label: 'Add competitor', hint: competitorProject ? `To ${competitorProject.name}` : 'To existing research', href: competitorProject ? projectPath(base, '/channels?from=research&add=competitor') : `${base}/projects/new`, icon: 'UserPlusIcon', tint: 'bg-sky-50 text-sky-700', show: manage, projectId: competitorProject?.id || '' },
    { label: 'Run analysis', hint: home?.analysisReadyCount ? `${home.analysisReadyCount} project${home.analysisReadyCount === 1 ? '' : 's'} ready` : 'After videos are imported', href: analysisProject ? projectPath(base, '/videos') : `${base}/projects/new`, icon: 'LightBulbIcon', tint: 'bg-amber-50 text-amber-700', show: true, projectId: analysisProject?.id || '' },
    { label: 'Generate report', hint: 'PDF or share link', href: reportProject ? projectPath(base, '/reports') : `${base}/projects/new`, icon: 'DocumentChartBarIcon', tint: 'bg-emerald-50 text-emerald-700', show: true, projectId: reportProject?.id || '' },
  ].filter((item) => item.show), [analysisProject, base, competitorProject, home?.analysisReadyCount, manage, reportProject]);

  const statCards = [
    { label: 'Active projects', value: stats.activeProjects ?? 0, hint: `of ${stats.totalProjects ?? 0}`, icon: 'FolderIcon', tone: 'bg-violet-50 text-violet-600', hintClass: 'text-violet-500' },
    { label: 'Channels tracked', value: (stats.ownChannels || 0) + (stats.competitorChannels || 0), hint: `${stats.ownChannels || 0} own · ${stats.competitorChannels || 0} comp.`, icon: 'PlayCircleIcon', tone: 'bg-sky-50 text-sky-600', hintClass: 'text-sky-500' },
    { label: 'Videos imported', value: Number(stats.videos || 0).toLocaleString('en-IN'), hint: stats.videosThisWeek ? `+${Number(stats.videosThisWeek).toLocaleString('en-IN')} this week` : 'this week', icon: 'FilmIcon', tone: 'bg-rose-50 text-rose-600', hintClass: 'text-emerald-600' },
    { label: 'Reports generated', value: stats.reports ?? 0, hint: `${stats.reportsThisMonth || 0} this month`, icon: 'DocumentChartBarIcon', tone: 'bg-amber-50 text-amber-600', hintClass: 'text-amber-600' },
  ];

  if (loading) return <PageLoader label="Loading dashboard…" />;

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes yt-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes yt-grow { from { transform: scaleY(0); opacity: .4; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes yt-shine { 0% { background-position: 0% 0%; } 100% { background-position: 0% 120%; } }
        @keyframes yt-pulse-soft { 0%,100% { box-shadow: 0 0 0 0 rgb(124 58 237 / 0.18); } 50% { box-shadow: 0 0 0 8px rgb(124 58 237 / 0); } }
      `}</style>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{greeting}</h1>
          <p className="mt-1 text-sm text-slate-500">Here&apos;s how your research is tracking this week.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`${base}/projects`} className={partnerBtnSecondary}>View all projects</Link>
          {manage ? <Link href={`${base}/projects/new`} className={partnerBtnPrimary}>+ New project</Link> : null}
        </div>
      </div>

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card, index) => (
              <article key={card.label} className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`} style={{ animation: `yt-bob 2.6s ease-in-out ${index * 180}ms infinite` }}>
                    <Icon name={card.icon} size={18} />
                  </span>
                </div>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-bricolage text-3xl font-bold tracking-tight text-slate-900">
                  <span>{card.value}</span>
                  <span className={`text-sm font-medium ${card.hintClass}`}>{card.hint}</span>
                </p>
              </article>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quick.map((item, index) => (
              <Link key={item.label} href={item.href} onClick={() => { if (item.projectId) rememberProject(item.projectId); }} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:border-secondary/30">
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.tint}`} style={{ animation: `yt-pulse-soft 2.8s ease-in-out ${index * 200}ms infinite` }}>
                    <MotionIcon name={item.icon} delay={index * 160} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.hint}</span>
                  </span>
                </span>
                <Icon name="ChevronRightIcon" size={16} className="text-slate-300" />
              </Link>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              {!projects.length ? (
                <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                  <p className="font-semibold text-slate-800">No research projects yet</p>
                  <p className="mt-1 text-sm text-slate-500">Create a project, add your channel, then competitors.</p>
                  {manage ? <Link href={`${base}/projects/new`} className={`${partnerBtnPrimary} mt-4`}>+ New project</Link> : null}
                </section>
              ) : null}

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-3">
                  <h2 className="inline-flex items-center gap-2 font-bricolage text-base font-semibold text-slate-900">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600" style={{ animation: 'yt-bob 2.5s ease-in-out infinite' }}>
                      <Icon name="RectangleStackIcon" size={16} />
                    </span>
                    Recent projects
                  </h2>
                  <Link href={`${base}/projects`} className="text-sm font-semibold text-secondary">View all</Link>
                </div>
                <ul className="divide-y divide-slate-50">
                  {projects.slice(0, 4).map((project, index) => (
                    <li key={project.id}>
                      <button type="button" className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50/80" onClick={() => openProject(project.id)}>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${PROJECT_AVATARS[index % PROJECT_AVATARS.length]}`}>{project.initials}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-900">{project.name}</span>
                          <span className="block truncate text-xs text-slate-500">{project.own_channel_name || project.brand_name || 'No own channel'} · {formatAgo(project.updated_at)}</span>
                        </span>
                        <span className="hidden min-w-[9rem] sm:block">
                          <ProjectProgress project={project} />
                        </span>
                        <ChannelStack project={project} index={index} />
                      </button>
                    </li>
                  ))}
                  {!projects.length ? <li className="px-5 py-8 text-center text-sm text-slate-500">Projects you create will show up here.</li> : null}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-violet-50/40 to-sky-50/50 p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="inline-flex items-center gap-2 font-bricolage text-lg font-semibold text-slate-900">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600" style={{ animation: 'yt-bob 2.4s ease-in-out infinite' }}>
                        <Icon name="ChartBarIcon" size={18} />
                      </span>
                      Videos imported
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {importSeries.some((row) => row.count) ? importMeta?.hint : `No imports in ${importMeta?.label.toLowerCase()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full bg-white/80 p-0.5 ring-1 ring-slate-100">
                      {IMPORT_RANGES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setImportRange(item.id)}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${importRange === item.id ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{Number(stats.videos || 0).toLocaleString('en-IN')} total</p>
                  </div>
                </div>
                <div className="flex h-64 items-end gap-2 overflow-x-auto pb-1">
                  {importSeries.map((row, index) => (
                    <div
                      key={`${importRange}-${row.key || row.week || row.label}`}
                      className={`flex h-full flex-col items-center justify-end gap-1.5 ${importSeries.length > 14 ? 'w-9 shrink-0' : 'min-w-0 flex-1'}`}
                    >
                      <span className="text-[10px] font-semibold text-slate-500">{row.count || ''}</span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full origin-bottom rounded-t-2xl bg-gradient-to-t ${row.count ? BAR_TONES[index % BAR_TONES.length] : 'from-slate-200 to-slate-100'}`}
                          style={{
                            height: `${row.count ? Math.max(10, Math.round((row.count / weekMax) * 100)) : 6}%`,
                            backgroundSize: '100% 200%',
                            animation: `yt-grow .7s ease-out ${index * 45}ms both, yt-shine 3.6s linear ${index * 120}ms infinite`,
                          }}
                          title={`${row.count} videos · ${row.label}`}
                        />
                      </div>
                      <span className="max-w-full truncate text-[10px] text-slate-400">{row.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="inline-flex items-center gap-2 font-bricolage text-base font-semibold text-slate-900">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500" style={{ animation: 'yt-bob 2.3s ease-in-out infinite' }}>
                      <Icon name="ExclamationTriangleIcon" size={16} />
                    </span>
                    Needs attention
                  </h2>
                  {(home?.needsAttention || []).length ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">+{(home?.needsAttention || []).length}</span> : null}
                </div>
                <ul className="space-y-3">
                  {(home?.needsAttention || []).map((item: { id: string; title: string; detail: string; action: string; href: string }) => {
                    const mark = attentionIcon(item.title);
                    return (
                    <li key={`${item.id}-${item.title}`} className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${mark.tint}`} style={{ animation: 'yt-bob 2.5s ease-in-out infinite' }}>
                          <Icon name={mark.icon} size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.detail}</p>
                        </div>
                      </div>
                      <button type="button" className="shrink-0 text-sm font-semibold text-secondary" onClick={() => go(item.id, item.href)}>{item.action}</button>
                    </li>
                    );
                  })}
                  {!(home?.needsAttention || []).length ? <li className="text-sm text-slate-500">You&apos;re caught up.</li> : null}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="inline-flex items-center gap-2 font-bricolage text-base font-semibold text-slate-900">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600" style={{ animation: 'yt-bob 2.6s ease-in-out .2s infinite' }}>
                      <Icon name="DocumentChartBarIcon" size={16} />
                    </span>
                    Latest reports
                  </h2>
                  <button type="button" className="text-sm font-semibold text-secondary" onClick={() => { const project = reportProject || projects[0]; if (project) go(project.id, '/reports'); }}>All reports →</button>
                </div>
                <ul className="space-y-3">
                  {(home?.reports || []).map((row: { id: string; name: string; report_type: string; generated_at: string; project_id: string; project_name: string }) => (
                    <li key={row.id}>
                      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => go(row.project_id, `/reports/${row.id}`)}>
                        <span className="mt-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{reportKind(row.report_type)}</span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{row.name}</span>
                          <span className="block text-xs text-slate-500">{row.project_name} · {formatAgo(row.generated_at)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {!(home?.reports || []).length ? <li className="text-sm text-slate-500">No reports yet. Generate one from selected videos.</li> : null}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 inline-flex items-center gap-2 font-bricolage text-base font-semibold text-slate-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600" style={{ animation: 'yt-bob 2.4s ease-in-out .1s infinite' }}>
                    <Icon name="UserGroupIcon" size={16} />
                  </span>
                  Team activity
                </h2>
                <ul className="space-y-3">
                  {(home?.activity || []).map((row: { action: string; created_at: string; actor_name: string; project_id: string; project_name?: string; channel_name?: string }, index: number) => (
                    <li key={`${row.created_at}-${index}`} className="flex gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${PROJECT_AVATARS[index % PROJECT_AVATARS.length]}`}>{(row.actor_name || 'S').slice(0, 2).toUpperCase()}</span>
                      <span>
                        <span className="block text-sm text-slate-700">{activityLine(row)}</span>
                        <span className="block text-xs text-slate-400">{formatAgo(row.created_at)}</span>
                      </span>
                    </li>
                  ))}
                  {!(home?.activity || []).length ? <li className="text-sm text-slate-500">Activity from your team will appear here.</li> : null}
                </ul>
              </section>
            </div>
          </div>
    </div>
  );
}
