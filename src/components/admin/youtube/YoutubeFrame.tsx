'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import Icon from '@/components/ui/AppIcon';

const YoutubeAccessContext = createContext<string[]>([]);

export function useYoutubeAccess() {
  return useContext(YoutubeAccessContext);
}

export function allow(access: string[], key: string) {
  return access.includes(key);
}

export async function yt(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/youtube/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

export function youtubePageBase(pathname: string) {
  return pathname.startsWith('/partner/youtube-research') ? '/partner/youtube-research' : '/admin/youtube-research';
}

export function useYoutubePageBase() {
  return youtubePageBase(usePathname() || '');
}

function projectCookieName() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  return path.startsWith('/partner/') ? 'ta_yt_partner_project' : 'ta_yt_project';
}

export function rememberProject(id: string) {
  document.cookie = `${projectCookieName()}=${encodeURIComponent(id)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function currentProjectId() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${projectCookieName()}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function useProjectId() {
  const [id, setId] = useState('');
  useEffect(() => {
    setId(currentProjectId());
  }, []);
  return id;
}

export function ProjectRequired({ children }: { children: React.ReactNode }) {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <p className="text-sm text-slate-500">Loading project...</p>;
  if (!projectId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Choose a research project to continue.</p>
        <Link href={base} className="mt-3 inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white">Research Projects</Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function metric(value: unknown) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString('en-IN');
}

export function Bars({ rows }: { rows: { label: string; value: number | null }[] }) {
  const plotted = rows.filter((row) => row.value != null);
  const max = Math.max(1, ...plotted.map((row) => row.value || 0));
  if (!plotted.length) return <p className="text-sm text-slate-500">No public counts are available for this selection. Refresh the videos to load them.</p>;
  return (
    <div className="space-y-2">
      {plotted.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between gap-3 text-xs text-slate-500">
            <span className="truncate">{row.label}</span>
            <span>{metric(row.value)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="chart-bar-fill h-2 rounded-full bg-secondary" style={{ width: `${Math.max(4, Math.round(((row.value || 0) / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const WORKSPACE = [
  { suffix: '/overview', label: 'Overview', section: 'overview', icon: 'HomeIcon' },
  { suffix: '/channels', label: 'Channels', section: 'channels', icon: 'UserGroupIcon' },
  { suffix: '/videos', label: 'Videos', section: 'videos', icon: 'PlayCircleIcon' },
  { suffix: '/reports', label: 'Reports', section: 'reports', icon: 'DocumentChartBarIcon' },
  { suffix: '/analysis', label: 'AI Analysis', section: 'analysis', icon: 'LightBulbIcon' },
];

const SECTION_HINT: Record<string, string> = {
  overview: 'Analyze your channel and competitors using public YouTube Data API values.',
  channels: 'Manage your own channel and competitor channels for this project.',
  import: 'Import public videos for the channels in this project.',
  videos: 'Search and review imported videos for this project.',
  analysis: 'Find improvement opportunities and get AI-powered recommendations for better performing videos.',
  compare: 'Compare imported videos side by side.',
  'channel-compare': 'Compare own and competitor channels using public Data API values.',
  reports: 'Preview, save, and export AI research reports for this project.',
};

const SECTION_LABEL: Record<string, string> = {
  overview: 'Overview',
  channels: 'Channels',
  import: 'Import Videos',
  videos: 'Videos',
  analysis: 'AI Analysis',
  compare: 'Compare Videos',
  'channel-compare': 'Channel Comparison',
  reports: 'Reports',
};

function sectionOf(pathname: string) {
  return pathname.replace(youtubePageBase(pathname), '').split('/').filter(Boolean)[0] || '';
}

function isWorkspace(pathname: string) {
  const base = youtubePageBase(pathname);
  if (
    pathname === base
    || pathname.startsWith(`${base}/settings`)
    || pathname.startsWith(`${base}/projects/new`)
    || pathname.startsWith(`${base}/performance`)
  ) return false;
  const section = sectionOf(pathname);
  if (section === 'projects' && pathname.endsWith('/edit')) return true;
  return ['overview', 'channels', 'import', 'videos', 'analysis', 'compare', 'channel-compare', 'reports'].includes(section);
}

function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <p className="text-sm text-slate-500">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index ? <span className="px-1">/</span> : null}
          {item.href ? <Link href={item.href} className="font-semibold text-slate-700">{item.label}</Link> : <span className="text-slate-800">{item.label}</span>}
        </span>
      ))}
    </p>
  );
}

function ProjectNav({ activeSection, base }: { activeSection: string; base: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Project">
      {WORKSPACE.map((item) => {
        const active = activeSection === item.section;
        return (
          <Link
            key={item.suffix}
            href={`${base}${item.suffix}`}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${active ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function YoutubeFrame({ children, initialAccess }: { children: React.ReactNode; initialAccess?: string[] }) {
  const pathname = usePathname() || '';
  const base = youtubePageBase(pathname);
  const [access, setAccess] = useState<string[] | null>(initialAccess ?? null);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');
  const [project, setProject] = useState<{ name: string; status: string; objective: string; brand_name: string; industry: string; thumbnail: string } | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [stickyTop, setStickyTop] = useState(176);
  const workspace = isWorkspace(pathname);
  const section = sectionOf(pathname);
  const activeSection = section === 'import' || section === 'channel-compare' ? 'channels' : section === 'compare' ? 'videos' : section;

  useEffect(() => {
    if (initialAccess) return;
    yt('session').then((body) => setAccess(body.permissions || [])).catch((err) => setError(err.message));
  }, [initialAccess]);

  useEffect(() => {
    const id = currentProjectId();
    setProjectId(id);
    if (!id || !isWorkspace(pathname)) {
      setProject(null);
      return;
    }
    yt(`projects/${id}`).then((body) => {
      const own = (body.channels || []).find((channel: { relationship: string }) => channel.relationship === 'own');
      setProject({
        name: body.name || 'Project',
        status: body.status || 'active',
        objective: body.objective || '',
        brand_name: body.brand_name || '',
        industry: body.industry || '',
        thumbnail: own?.thumbnail_url || '',
      });
    }).catch(() => setProject(null));
  }, [pathname]);

  const crumbs = workspace
    ? [
        { href: base, label: 'YouTube Research' },
        { href: base, label: 'Research Projects' },
        { href: `${base}/overview`, label: project?.name || 'Project' },
        ...(SECTION_LABEL[section === 'import' ? 'import' : section === 'compare' ? 'compare' : section === 'channel-compare' ? 'channel-compare' : activeSection]
          ? [{ label: SECTION_LABEL[section === 'import' ? 'import' : section === 'compare' ? 'compare' : section === 'channel-compare' ? 'channel-compare' : activeSection] }]
          : []),
      ]
    : pathname.startsWith(`${base}/settings`)
      ? [{ href: base, label: 'YouTube Research' }, { label: 'Settings' }]
      : pathname.startsWith(`${base}/projects/new`)
        ? [{ href: base, label: 'YouTube Research' }, { href: base, label: 'Research Projects' }, { label: 'Create Project' }]
        : [{ href: base, label: 'YouTube Research' }, { label: 'Research Projects' }];

  const manage = access?.includes('youtube_research.channels.manage');

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const update = () => setStickyTop(node.getBoundingClientRect().bottom);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [workspace, project?.name, access]);

  return (
    <div className="space-y-4" style={{ ['--yt-sticky' as string]: `${stickyTop}px` }}>
      {workspace ? (
        <div ref={headerRef} className="sticky top-16 z-40 -mx-4 -mt-5 bg-white px-4 pb-0 pt-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Crumbs items={crumbs} />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {project?.thumbnail ? <img src={project.thumbnail} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">YT</span>}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-bricolage text-2xl font-bold tracking-tight text-slate-900">{project?.name || 'Project'}</h1>
                  <AdminBadge variant={project?.status === 'archived' ? 'default' : 'green'}>{project?.status || 'active'}</AdminBadge>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-slate-500">{SECTION_HINT[section] || SECTION_HINT[activeSection] || [project?.industry, project?.brand_name, project?.objective].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {manage && projectId ? (
                <Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" href={`${base}/projects/${projectId}/edit`}>
                  <Icon name="PencilSquareIcon" size={16} /> Edit Project
                </Link>
              ) : null}
              <Link className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white" href={base}>
                <Icon name="ArrowLeftIcon" size={16} /> Back to Projects
              </Link>
            </div>
          </div>
          <div className="mt-4 border-b border-slate-200">
            <ProjectNav activeSection={activeSection} base={base} />
          </div>
        </div>
      ) : <Crumbs items={crumbs} />}
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {access && !access.includes('youtube_research.view') ? (
        <AdminAlert>You do not have YouTube Research access. Ask a Super Admin to grant it.</AdminAlert>
      ) : null}
      {access?.includes('youtube_research.view') ? (
        <YoutubeAccessContext.Provider value={access}>
          {children}
        </YoutubeAccessContext.Provider>
      ) : null}
      {access === null && !error ? <p className="text-sm text-slate-500">Loading YouTube Research...</p> : null}
    </div>
  );
}
