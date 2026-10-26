'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import Icon from '@/components/ui/AppIcon';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { YOUTUBE_PROJECT_PAGES, YOUTUBE_TAB_HINT, youtubeNestedLabel, youtubeWorkspaceTab } from '@/lib/youtube/workspace-nav';

const YoutubeAccessContext = createContext<string[]>([]);
const YoutubeProjectContext = createContext('');
const YoutubeRailSetContext = createContext<(node: ReactNode | null) => void>(() => undefined);

export function useYoutubeRailActions(node: ReactNode | null) {
  const setRail = useContext(YoutubeRailSetContext);
  useLayoutEffect(() => {
    setRail(node);
    return () => setRail(null);
  }, [node, setRail]);
}

export function useYoutubeAccess() {
  return useContext(YoutubeAccessContext);
}

export function allow(access: string[], key: string) {
  return access.includes(key);
}

export function youtubePortalHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const path = window.location.pathname;
  const portal = path.startsWith('/partner/') ? 'partner' : path.startsWith('/youtube') || path.startsWith('/leads') || path.startsWith('/home') || path.startsWith('/billing') ? 'saas' : 'admin';
  return { 'x-techantum-portal': portal };
}

export function youtubeApiPrefix() {
  return '/api/youtube';
}

export async function yt(path: string, init?: RequestInit) {
  const response = await fetch(`${youtubeApiPrefix()}/${path}`, {
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

export function youtubePageBase(_pathname: string) {
  return '/youtube';
}

export function useYoutubePageBase() {
  return youtubePageBase(usePathname() || '');
}

function projectCookieName() {
  return 'revealeo_yt_project';
}

export function rememberProject(id: string) {
  document.cookie = `${projectCookieName()}=${encodeURIComponent(id)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function currentProjectId() {
  for (const name of [projectCookieName(), 'saas_yt_project']) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
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
        <Link href={`${base}/projects`} className={`mt-3 ${partnerBtnPrimary}`}>Open projects</Link>
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

function sectionOf(pathname: string) {
  return pathname.replace(youtubePageBase(pathname), '').split('/').filter(Boolean)[0] || '';
}

function isWorkspace(pathname: string) {
  const base = youtubePageBase(pathname);
  if (
    pathname === base
    || pathname.startsWith(`${base}/settings`)
    || pathname === `${base}/projects`
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
  const [railActions, setRailActions] = useState<ReactNode | null>(null);
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

  const crumbs = pathname.startsWith(`${base}/settings`)
    ? [{ href: base, label: 'YouTube Research' }, { label: 'Settings' }]
    : pathname.startsWith(`${base}/projects/new`)
      ? [{ href: `${base}/projects`, label: 'Projects' }, { label: 'Create Project' }]
      : [];

  const activeTab = youtubeWorkspaceTab(crumbSection);
  const nestedLabel = youtubeNestedLabel(section);
  const nestedBack = section === 'channels' || section === 'import'
    ? `${base}/videos`
    : section === 'compare'
      ? `${base}/videos`
      : '';

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
  }, [workspace, project?.name, access, nestedLabel, railActions]);

  return (
    <div className="space-y-4" style={{ ['--yt-sticky' as string]: `${stickyTop}px` }}>
      {workspace ? (
        <div ref={headerRef} className="sticky top-14 z-40 -mx-4 -mt-6 border-b border-slate-200 bg-white px-4 pb-0 pt-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link href={`${base}/projects`} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-secondary">
                <Icon name="ArrowLeftIcon" size={16} /> Back to projects
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{project?.name || 'Project'}</h1>
                <AdminBadge variant={project?.status === 'archived' ? 'default' : 'green'}>{project?.status === 'active' ? 'Active' : project?.status || 'active'}</AdminBadge>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">{project?.objective || YOUTUBE_TAB_HINT[section] || YOUTUBE_TAB_HINT[activeTab] || 'Competition Research'}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link className={partnerBtnSecondary} href={`${base}/projects`}>
                ← All projects
              </Link>
              {railActions || nestedLabel ? railActions : (
                <Link className={partnerBtnPrimary} href={`${base}/channel-compare`}>
                  <Icon name="LightBulbIcon" size={16} /> Analyse results
                </Link>
              )}
            </div>
          </div>
          <nav className="mt-4 flex gap-6 overflow-x-auto" aria-label="Project sections">
            {YOUTUBE_PROJECT_PAGES.map((item) => {
              const active = activeTab === item.section && !nestedLabel;
              const parent = activeTab === item.section && nestedLabel;
              return (
                <Link
                  key={item.suffix}
                  href={`${base}${item.suffix}`}
                  className={`-mb-px shrink-0 border-b-2 pb-3 text-sm ${
                    active ? 'border-secondary font-semibold text-secondary' : parent ? 'border-secondary/40 font-semibold text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {nestedLabel ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2.5 text-sm">
              <p className="text-slate-500">
                <span className="font-medium text-slate-700">{YOUTUBE_PROJECT_PAGES.find((item) => item.section === activeTab)?.label || 'Research'}</span>
                <span className="px-1.5 text-slate-300">/</span>
                <span className="font-semibold text-slate-900">{nestedLabel}</span>
              </p>
              {nestedBack ? <Link href={nestedBack} className="font-semibold text-secondary">← Back</Link> : null}
            </div>
          ) : null}
        </div>
      ) : pathname === base || pathname === `${base}/projects` ? null : crumbs.length ? <Crumbs items={crumbs} /> : null}
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {access && !access.includes('youtube_research.view') ? (
        <AdminAlert>You do not have YouTube Research access. Ask a Super Admin to grant it.</AdminAlert>
      ) : null}
      {access?.includes('youtube_research.view') ? (
        <YoutubeAccessContext.Provider value={access}>
          <YoutubeProjectContext.Provider value={projectId}>
            {workspace ? (
              <YoutubeRailSetContext.Provider value={setRailActions}>
                <div className="min-w-0">{children}</div>
              </YoutubeRailSetContext.Provider>
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
