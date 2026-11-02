'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';

const NAV = [
  { href: '/overview', label: 'Overview', icon: '▣' },
  { href: '/leads', label: 'Leads', icon: '◎' },
  { href: '/pipeline', label: 'Sales Pipeline', icon: '▦' },
  { href: '/sources', label: 'Lead Sources', icon: '⇄' },
  { href: '/inbox', label: 'WhatsApp Inbox', icon: '💬', badgeKey: 'inbox' },
  { href: '/calls', label: 'AI Voice Calls', icon: '☎' },
  { href: '/automations', label: 'Automation Workflows', icon: '⎇' },
  { href: '/agents', label: 'AI Agent Configuration', icon: '✦' },
  { href: '/tasks', label: 'Tasks & Follow-ups', icon: '☑' },
  { href: '/documents', label: 'Documents', icon: '📄' },
  { href: '/zoho', label: 'Zoho CRM Sync', icon: '⇄' },
  { href: '/costs', label: 'Cost & Capacity', icon: '₹' },
  { href: '/reports', label: 'Reports & Analytics', icon: '▥' },
  { href: '/settings', label: 'Settings & Integrations', icon: '⚙' },
  { href: '/readiness', label: 'Go-live readiness', icon: '!' },
];

export default function CrmShell({
  children,
  user,
  inboxCount = 0,
  mode = 'sandbox',
}: {
  children: ReactNode;
  user?: { fullName: string; role: string; email?: string } | null;
  inboxCount?: number;
  mode?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [workspaceName, setWorkspaceName] = useState('AI Lead CRM');
  const [workspaceSlug, setWorkspaceSlug] = useState('workspace');
  const [liveMode, setLiveMode] = useState(mode);
  const [badge, setBadge] = useState(inboxCount);
  const [providers, setProviders] = useState({ whatsapp: false, llm: false, telephony: false });

  useEffect(() => {
    api('/api/v1/workspace')
      .then((body) => {
        setWorkspaceName(body.settings?.business_name || body.workspace?.name || 'AI Lead CRM');
        setWorkspaceSlug(body.workspace?.slug || 'workspace');
        setLiveMode(body.mode || mode);
        setBadge(body.inboxCount ?? inboxCount);
        setProviders(body.providers || providers);
      })
      .catch(() => null);
  }, [pathname]);

  const initials = useMemo(() => {
    const parts = (user?.fullName || 'AM').trim().split(/\s+/);
    return ((parts[0]?.[0] || 'A') + (parts[1]?.[0] || 'M')).toUpperCase();
  }, [user?.fullName]);

  async function logout() {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/leads?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col bg-sidebar text-slate-200">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300">AI CRM</div>
          <div className="mt-1 text-sm font-semibold text-white">AI CRM</div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-sm font-medium text-white">{workspaceName}</div>
            <div className="text-[11px] text-slate-400">{workspaceSlug}</div>
          </div>
        </div>

        <div className="px-3 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          AI Lead CRM
        </div>
        <nav className="crm-scroll mt-2 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const showBadge = item.badgeKey === 'inbox' && badge > 0 ? badge : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                  active ? 'bg-secondary text-white shadow-lg shadow-violet-900/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="w-5 text-center opacity-80">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {showBadge ? (
                  <span className={`rounded-full px-1.5 text-[10px] font-semibold ${active ? 'bg-white/20' : 'bg-secondary text-white'}`}>
                    {showBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
            <div className="font-medium text-slate-200">Live workspace data</div>
            Schema <code>crm</code> · WA {providers.whatsapp ? 'on' : 'off'} · LLM {providers.llm ? 'on' : 'off'} ·
            Tel {providers.telephony ? 'on' : 'off'}
          </div>
          <button onClick={logout} className="mt-2 w-full rounded-xl px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/5 hover:text-white">
            Sign out · {user?.email || user?.fullName}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-4 px-5 py-3">
            <div className="min-w-[160px] text-xs text-slate-500">
              <div className="font-medium text-slate-800">{workspaceName}</div>
              <div>AI Lead CRM</div>
            </div>
            <form onSubmit={onSearch} className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-slate-400">⌕</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search leads, tasks, conversations"
                className="w-full bg-transparent text-sm outline-none"
              />
            </form>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-700 md:inline">
                {liveMode} · DB live
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-slate-800">{user?.fullName || 'User'}</div>
                  <div className="text-[11px] capitalize text-slate-500">{user?.role?.replaceAll('_', ' ')}</div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="crm-scroll flex-1 overflow-auto p-5">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-5 py-2 text-[11px] text-slate-500">
          {workspaceName} · schema crm · Asia/Kolkata
        </footer>
      </div>
    </div>
  );
}
