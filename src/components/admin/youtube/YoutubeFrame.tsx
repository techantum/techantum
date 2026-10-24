'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import Icon from '@/components/ui/AppIcon';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { YOUTUBE_PROJECT_PAGES } from '@/lib/youtube/workspace-nav';

const YoutubeAccessContext = createContext<string[]>([]);
const YoutubeProjectContext = createContext('');

export function useYoutubeAccess() {
  return useContext(YoutubeAccessContext);
}

export function allow(access: string[], key: string) {
  return access.includes(key);
}

export function youtubePortalHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return { 'x-techantum-portal': window.location.pathname.startsWith('/partner/') ? 'partner' : 'admin' };
}

export async function yt(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/youtube/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...youtubePortalHeader(),
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
  const fromFrame = useContext(YoutubeProjectContext);
  const [id, setId] = useState('');
  useEffect(() => {
    setId(currentProjectId());
  }, [fromFrame]);
  return fromFrame || id;
}

export function ProjectRequired({ children }: { children: React.ReactNode }) {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <PageLoader label="Loading project…" />;
  if (!projectId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Choose a research project to continue.</p>
        <Link href={base} className={`mt-3 ${partnerBtnPrimary}`}>Research Projects</Link>
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

const SECTION_HINT: Record<string, string> = {
  overview: 'Project snapshot for the selected research workspace.',
  channels: 'Add your own YouTube channel first, then competitor channels to compare.',
  import: 'Import public videos for the channels in this project.',
  videos: 'Filter own and competitor videos, then generate a summary or a report.',
  analysis: 'Open a saved analysis or run a custom AI analysis.',
  compare: 'Compare imported videos side by side.',
  'channel-compare': 'Compare own and competitor channels using public Data API values.',
  reports: 'Open a saved comparison or download it as Excel.',
};

const SECTION_LABEL: Record<string, string> = {
  overview: 'Project',
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
  const crumbSection = section === 'import' ? 'import' : section === 'compare' ? 'compare' : section === 'channel-compare' ? 'channel-compare' : section;

  useEffect(() => {
    if (initialAccess) return;
    yt('session').then((body) => setAccess(body.permissions || [])).catch((err) => setError(err.message));
  }, [initialAccess]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id = currentProjectId();
      if (!id) {
        try {
          const listed = await yt('projects?status=active&page=1&pageSize=1');
          id = listed.rows?.[0]?.id || '';
          if (id) rememberProject(id);
        } catch {
          id = '';
        }
      }
      if (cancelled) return;
      setProjectId(id);
      if (!id || !isWorkspace(pathname)) {
        setProject(null);
        return;
      }
      try {
        const body = await yt(`projects/${id}`);
        if (cancelled) return;
        const own = (body.channels || []).find((channel: { relationship: string }) => channel.relationship === 'own');
        setProject({
          name: body.name || 'Project',
          status: body.status || 'active',
          objective: body.objective || '',
          brand_name: body.brand_name || '',
          industry: body.industry || '',
          thumbnail: own?.thumbnail_url || '',
        });
      } catch {
        if (!cancelled) setProject(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const crumbs = workspace
    ? [
        { href: base, label: 'Dashboard' },
        { href: `${base}/channels`, label: project?.name || 'Project' },
        ...(SECTION_LABEL[crumbSection] ? [{ label: SECTION_LABEL[crumbSection] }] : []),
      ]
    : pathname.startsWith(`${base}/settings`)
      ? [{ href: base, label: 'YouTube Research' }, { label: 'Settings' }]
      : pathname.startsWith(`${base}/projects/new`)
        ? [{ href: base, label: 'Dashboard' }, { label: 'Create Project' }]
        : [{ href: base, label: 'YouTube Research' }, { label: 'Dashboard' }];

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
        <div ref={headerRef} className="sticky top-16 z-40 -mx-4 -mt-5 border-b border-slate-200 bg-white px-4 pb-4 pt-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Crumbs items={crumbs} />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {project?.thumbnail ? <img src={project.thumbnail} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">YT</span>}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-bricolage text-2xl font-bold tracking-tight text-slate-900">{project?.name || 'Project'}</h1>
                  <AdminBadge variant={project?.status === 'archived' ? 'default' : 'green'}>{project?.status || 'active'}</AdminBadge>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-slate-500">{SECTION_HINT[section] || SECTION_HINT[crumbSection] || [project?.industry, project?.brand_name, project?.objective].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {manage && projectId ? (
                <Link className={partnerBtnSecondary} href={`${base}/projects/${projectId}/edit`}>
                  <Icon name="PencilSquareIcon" size={16} /> Edit Project
                </Link>
              ) : null}
              <Link className={partnerBtnPrimary} href={base}>
                <Icon name="ArrowLeftIcon" size={16} /> Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : <Crumbs items={crumbs} />}
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {access && !access.includes('youtube_research.view') ? (
        <AdminAlert>You do not have YouTube Research access. Ask a Super Admin to grant it.</AdminAlert>
      ) : null}
      {access?.includes('youtube_research.view') ? (
        <YoutubeAccessContext.Provider value={access}>
          <YoutubeProjectContext.Provider value={projectId}>
            {workspace ? (
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="min-w-0 flex-1">{children}</div>
                <aside className="order-first lg:order-none lg:w-56">
                  <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-24 lg:block lg:space-y-1 lg:p-3" aria-label="Project pages">
                    {YOUTUBE_PROJECT_PAGES.map((item) => {
                      const active = crumbSection === item.section || (item.section === 'channels' && (section === 'import' || section === 'channel-compare')) || (item.section === 'videos' && section === 'compare');
                      return (
                        <Link
                          key={item.suffix}
                          href={`${base}${item.suffix}`}
                          className={`side-nav-item flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                            active ? 'bg-orange-100 font-medium text-secondary' : 'text-slate-600 hover:bg-orange-50/70 hover:text-secondary'
                          }`}
                        >
                          <Icon name={item.icon} size={16} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </aside>
              </div>
            ) : (
              children
            )}
          </YoutubeProjectContext.Provider>
        </YoutubeAccessContext.Provider>
      ) : null}
      {access === null && !error ? <PageLoader label="Loading YouTube Research…" /> : null}
    </div>
  );
}
