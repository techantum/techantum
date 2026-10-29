'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import { ProjectStatusBadge } from '@/components/admin/youtube/ProjectMarks';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { asPlatform, canonicalizeResearchPath, researchContentHref, researchPageBaseFromPath } from '@/lib/research/platforms';
import { researchProjectPages, youtubeNestedLabel, youtubeWorkspaceTab } from '@/lib/youtube/workspace-nav';

const YoutubeAccessContext = createContext<string[]>([]);
const YoutubeProjectContext = createContext('');
const YoutubePlatformContext = createContext('');
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
  const portal = path.startsWith('/partner/') ? 'partner' : path.startsWith('/youtube') || path.startsWith('/projects') || path.startsWith('/facebook') || path.startsWith('/instagram') || path.startsWith('/linkedin') || path.startsWith('/leads') || path.startsWith('/home') || path.startsWith('/superadmin') || path.startsWith('/admin') || path.startsWith('/billing') ? 'saas' : 'admin';
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

export function youtubePageBase(pathname: string) {
  return researchPageBaseFromPath(pathname);
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

export function useProjectPlatform() {
  const fromFrame = useContext(YoutubePlatformContext);
  const pathname = usePathname() || '';
  return fromFrame || asPlatform(researchPageBaseFromPath(pathname).replace(/^\//, ''));
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
        <Link href="/projects" className={`mt-3 ${partnerBtnPrimary}`}>Open projects</Link>
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
    || pathname === '/projects'
    || pathname.startsWith('/projects/new')
    || pathname === `${base}/projects`
    || pathname.startsWith(`${base}/projects/new`)
    || pathname.startsWith(`${base}/performance`)
    || pathname.startsWith(`${base}/quick-analysis`)
    || pathname.startsWith(`${base}/quick-reports`)
    || pathname.startsWith(`${base}/quick-report`)
    || pathname.startsWith(`${base}/quick-research`)
    || pathname.startsWith(`${base}/ai-training`)
  ) return false;
  const section = sectionOf(pathname);
  if (section === 'projects' && pathname.endsWith('/edit')) return true;
  return ['overview', 'channels', 'import', 'videos', 'posts', 'analysis', 'compare', 'channel-compare', 'reports'].includes(section);
}

export default function YoutubeFrame({ children, initialAccess }: { children: React.ReactNode; initialAccess?: string[] }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const base = youtubePageBase(pathname);
  const [access, setAccess] = useState<string[] | null>(initialAccess ?? null);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');
  const [project, setProject] = useState<{ name: string; status: string; objective: string; brand_name: string; industry: string; thumbnail: string; platform: string } | null>(null);
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
          platform: body.platform || 'youtube',
        });
      } catch {
        if (!cancelled) setProject(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!workspace || !project?.platform) return;
    const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
    const next = canonicalizeResearchPath(pathname, project.platform, search);
    if (next) router.replace(next);
  }, [workspace, project?.platform, pathname, searchParams, router]);

  const activeTab = youtubeWorkspaceTab(crumbSection);
  const nestedLabel = youtubeNestedLabel(section, project?.platform || researchPageBaseFromPath(pathname).replace(/^\//, ''));
  const nestedBack = section === 'channels' || section === 'import' || section === 'compare'
    ? researchContentHref(base)
    : section === 'channel-compare' && searchParams?.get('id')
      ? `${base}/channel-compare`
      : pathname.startsWith(`${base}/reports/`)
        ? `${base}/reports`
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{project?.name || 'Project'}</h1>
              <ProjectStatusBadge status={project?.status} />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {railActions || nestedLabel ? railActions : (
                <Link className={partnerBtnPrimary} href={`${base}/channel-compare`}>
                  <Icon name="LightBulbIcon" size={16} /> Analyse results
                </Link>
              )}
              <Link href={nestedBack || '/projects'} className={partnerBtnSecondary}>
                <Icon name="ArrowLeftIcon" size={16} /> {nestedBack ? 'Back' : 'Back to projects'}
              </Link>
            </div>
          </div>
          <nav className="mt-4 flex flex-nowrap items-end gap-6 overflow-x-auto overflow-y-hidden" aria-label="Project sections">
            {researchProjectPages(project?.platform || base).map((item, index) => {
              const active = activeTab === item.section && !nestedLabel;
              const parent = activeTab === item.section && nestedLabel;
              return (
                <Link
                  key={item.suffix}
                  href={`${base}${item.suffix}`}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-3 text-sm ${
                    active ? 'border-secondary font-semibold text-secondary' : parent ? 'border-secondary/40 font-semibold text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <NavIcon name={item.icon} itemKey={item.section} delay={index * 120} className="h-7 w-7 rounded-lg" size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {access && !access.includes('youtube_research.view') ? (
        <AdminAlert>You do not have Business Research access. Ask a Super Admin to grant it.</AdminAlert>
      ) : null}
      {access?.includes('youtube_research.view') ? (
        <YoutubeAccessContext.Provider value={access}>
          <YoutubeProjectContext.Provider value={projectId}>
            <YoutubePlatformContext.Provider value={project?.platform || asPlatform(researchPageBaseFromPath(pathname).replace(/^\//, ''))}>
            {workspace ? (
              <YoutubeRailSetContext.Provider value={setRailActions}>
                <div className="min-w-0">{children}</div>
              </YoutubeRailSetContext.Provider>
            ) : (
              children
            )}
            </YoutubePlatformContext.Provider>
          </YoutubeProjectContext.Provider>
        </YoutubeAccessContext.Provider>
      ) : null}
      {access === null && !error ? <PageLoader label="Loading Business Research…" /> : null}
    </div>
  );
}
