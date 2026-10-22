'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { PmBadge } from '@/components/admin/pm/ui';

type Tone = 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';

const toneStyles: Record<Tone, { band: string; icon: string; title: string }> = {
  sky: { band: 'bg-sky-50/70', icon: 'bg-sky-100 text-sky-600', title: 'text-sky-700' },
  emerald: { band: 'bg-emerald-50/70', icon: 'bg-emerald-100 text-emerald-600', title: 'text-emerald-700' },
  amber: { band: 'bg-amber-50/80', icon: 'bg-amber-100 text-amber-600', title: 'text-amber-700' },
  violet: { band: 'bg-violet-50/80', icon: 'bg-violet-100 text-violet-600', title: 'text-violet-700' },
  rose: { band: 'bg-rose-50/80', icon: 'bg-rose-100 text-rose-600', title: 'text-rose-700' },
  slate: { band: 'bg-slate-50', icon: 'bg-slate-100 text-slate-500', title: 'text-slate-700' },
};

function Metric({
  icon,
  label,
  value,
  href,
  tone = 'sky',
  emphasis = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  href?: string;
  tone?: Tone;
  emphasis?: boolean;
}) {
  const card = (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/80 bg-white px-3 py-3 shadow-sm shadow-slate-900/5 transition hover:border-secondary/30">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneStyles[tone].icon}`}>
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-slate-500">{label}</span>
        <span className={`block text-xl font-semibold leading-tight ${emphasis ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>
      </span>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function Band({
  title,
  icon,
  tone,
  children,
  columns,
}: {
  title: string;
  icon: string;
  tone: Tone;
  children: ReactNode;
  columns: string;
}) {
  return (
    <section className={`rounded-3xl p-4 ${toneStyles[tone].band}`}>
      <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${toneStyles[tone].title}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneStyles[tone].icon}`}>
          <Icon name={icon} size={15} />
        </span>
        {title}
      </h2>
      <div className={`grid gap-3 ${columns}`}>{children}</div>
    </section>
  );
}

function Board({
  title,
  icon,
  tone,
  action,
  children,
}: {
  title: string;
  icon: string;
  tone: Tone;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-[220px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneStyles[tone].icon}`}>
            <Icon name={icon} size={15} />
          </span>
          {title}
        </h2>
        {action}
      </div>
      <div className="flex-1 overflow-x-auto">{children}</div>
    </section>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-6 py-8 text-center text-sm text-slate-400">
      <Icon name={icon} size={28} className="text-slate-300" />
      {text}
    </div>
  );
}

function Head({ children }: { children: ReactNode }) {
  return <th className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">{children}</th>;
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="whitespace-nowrap border-b border-slate-50 px-3 py-2 text-sm text-slate-700">{children}</td>;
}

function kolkataHour() {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', hourCycle: 'h23' }).format(new Date());
  return Number(hour);
}

function greeting() {
  const hour = kolkataHour();
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  return 'Good evening!';
}

function formatToday(iso?: string) {
  const date = iso ? new Date(`${iso}T12:00:00+05:30`) : new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function ProjectDashboardPage() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/pm/dashboard').then(async (res) => {
      const body = await res.json();
      if (!res.ok) setError(body.error || 'Could not load the dashboard');
      else setData(body);
    });
  }, []);

  const portfolio = data?.portfolio || {};
  const compliance = data?.compliance || {};
  const health = data?.health || {};
  const support = data?.support || {};
  const ops = data?.operations || {};
  const n = (value: unknown): string | number => (value == null || value === '' ? 0 : typeof value === 'number' ? value : String(value));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Project Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Morning view of delivery status, update compliance, blockers and team load.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Icon name="CalendarDaysIcon" size={18} />
            </span>
            <span>
              <span className="block text-[11px] font-medium text-slate-400">Today</span>
              <span className="block text-sm font-semibold text-slate-800">{formatToday(data?.today)}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-500">
              <Icon name="SunIcon" size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">{greeting()}</span>
              <span className="block text-xs text-slate-500">Here&apos;s your project overview.</span>
            </span>
          </div>
        </div>
      </header>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <Band title="Delivery Status" icon="PaperAirplaneIcon" tone="sky" columns="sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Metric icon="DocumentTextIcon" label="Total Projects" value={n(portfolio.total)} href="/admin/pm/projects" />
        <Metric icon="ArrowPathIcon" label="Ongoing" value={n(portfolio.ongoing)} href="/admin/pm/projects?category=ongoing" />
        <Metric icon="CalendarDaysIcon" label="Planned to Onboard" value={n(portfolio.planned)} href="/admin/pm/projects?category=planned_to_onboard" />
        <Metric icon="CheckCircleIcon" label="Onboarded" value={n(portfolio.onboarded)} href="/admin/pm/projects?category=onboarded" tone="emerald" />
        <Metric icon="CheckCircleIcon" label="Delivered" value={n(portfolio.delivered)} href="/admin/pm/projects?category=delivered" tone="emerald" />
        <Metric icon="PauseCircleIcon" label="On Hold" value={n(portfolio.onHold)} href="/admin/pm/projects?category=on_hold" tone="violet" />
        <Metric icon="XCircleIcon" label="Cancelled" value={n(portfolio.cancelled)} href="/admin/pm/projects?category=cancelled" tone="rose" />
      </Band>

      <Band title="Updates & Compliance" icon="ChartBarIcon" tone="emerald" columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
        <Metric icon="ExclamationTriangleIcon" label="Projects at Risk" value={n(ops.atRisk)} href="/admin/pm/projects?health=At%20Risk" tone="amber" />
        <Metric icon="ClockIcon" label="Overdue Projects" value={n(ops.overdue ?? health.overdue)} href="/admin/pm/projects?health=Overdue" tone="amber" />
        <Metric icon="ExclamationCircleIcon" label="Update Pending" value={n(ops.updatePending ?? health.pending)} href="/admin/pm/projects?health=Update%20Pending" tone="amber" />
        <Metric icon="TicketIcon" label="Open Tickets" value={n(ops.openTickets)} href="/admin/pm/tickets" tone="amber" />
        <Metric icon="DocumentDuplicateIcon" label="Pending Requirements" value={n(ops.pendingRequirements)} href="/admin/pm/requirements" tone="emerald" />
        <Metric icon="ArrowPathIcon" label="Projects Requiring Update" value={n(compliance.requiring)} href="/admin/pm/daily" tone="sky" />
        <Metric icon="CheckCircleIcon" label="Updated Today" value={n(compliance.updated)} href="/admin/pm/daily" tone="emerald" />
        <Metric icon="XCircleIcon" label="Pending Today" value={n(compliance.pending)} href="/admin/pm/daily" tone="rose" />
        <Metric icon="ShieldCheckIcon" label="Compliance %" value={compliance.percent != null ? `${compliance.percent}%` : '0%'} href="/admin/pm/daily" tone="emerald" emphasis />
      </Band>

      <Band title="Team Capacity" icon="UserGroupIcon" tone="amber" columns="sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon="UsersIcon" label="Active Project Members" value={n(ops.activeMembers)} href="/admin/pm/team" tone="amber" />
        <Metric icon="UserIcon" label="Employees Allocated" value={n(ops.allocatedEmployees)} href="/admin/pm/team" tone="amber" />
        <Metric icon="UserMinusIcon" label="Employees Unallocated" value={n(ops.unallocated)} href="/admin/pm/team" tone="amber" />
        <Metric icon="ExclamationCircleIcon" label="Overloaded Employees" value={n(ops.overloaded)} href="/admin/pm/team" tone="rose" />
        <Metric icon="UserIcon" label="Missing Project Lead" value={n(ops.missingLead)} href="/admin/pm/projects?category=ongoing" tone="amber" />
      </Band>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Band title="Onboarding" icon="ClipboardDocumentCheckIcon" tone="violet" columns="sm:grid-cols-3">
          <Metric icon="CheckCircleIcon" label="Onboarding Ready" value={n(ops.onboardingReady)} href="/admin/pm/onboarding" tone="sky" />
          <Metric icon="ClockIcon" label="Onboarding Incomplete" value={n(ops.onboardingIncomplete)} href="/admin/pm/onboarding" tone="amber" />
          <Metric icon="XCircleIcon" label="Onboarding Not Ready" value={n(ops.onboardingNotReady)} href="/admin/pm/onboarding" tone="rose" />
        </Band>
        <div className="space-y-4">
          <Band title="Tickets & Risks" icon="ExclamationTriangleIcon" tone="rose" columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Metric icon="ExclamationTriangleIcon" label="High Priority Tickets" value={n(ops.highTickets)} href="/admin/pm/tickets" tone="rose" />
            <Metric icon="NoSymbolIcon" label="Blocked Tickets" value={n(ops.blockedTickets)} href="/admin/pm/tickets" tone="rose" />
            <Metric icon="ClockIcon" label="Awaiting Client Approval" value={n(ops.awaitingApproval)} href="/admin/pm/requirements" tone="violet" />
            <Metric icon="CalendarDaysIcon" label="Deadline Within 14 Days" value={n(ops.approachingDeadline)} href="/admin/pm/projects?category=ongoing" tone="violet" />
            <Metric icon="ExclamationCircleIcon" label="Overdue" value={n(health.overdue)} href="/admin/pm/projects?health=Overdue" tone="rose" />
          </Band>
          <Band title="Support" icon="LifebuoyIcon" tone="sky" columns="sm:grid-cols-3">
            <Metric icon="LifebuoyIcon" label="In Support" value={n(support.inSupport)} href="/admin/pm/projects?category=delivered" tone="sky" />
            <Metric icon="ClockIcon" label="Support Ending Soon" value={n(support.endingSoon)} href="/admin/pm/projects?health=Support%20Ending%20Soon" tone="amber" />
            <Metric icon="CheckCircleIcon" label="Support Ended" value={n(support.ended)} href="/admin/pm/projects?health=Support%20Ended" tone="slate" />
          </Band>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Board
          title="Needs Attention"
          icon="ExclamationTriangleIcon"
          tone="rose"
          action={<Link className="text-xs font-semibold text-secondary" href="/admin/pm/projects">View all →</Link>}
        >
          {(data?.attention || []).length ? (
            <table className="min-w-full">
              <thead><tr><Head>Project</Head><Head>Client</Head><Head>AM</Head><Head>Blocker</Head><Head>Next action</Head><Head>Owner</Head><Head>Due</Head></tr></thead>
              <tbody>
                {(data?.attention || []).map((row: Record<string, string>) => (
                  <tr key={row.id}>
                    <Cell><Link className="font-medium text-secondary" href={`/admin/pm/projects/${row.id}`}>{row.project_name}</Link></Cell>
                    <Cell>{row.client_name}</Cell>
                    <Cell>{row.account_manager_name}</Cell>
                    <Cell>{row.blockers}</Cell>
                    <Cell>{row.next_action}</Cell>
                    <Cell>{row.action_owner_name}</Cell>
                    <Cell>{row.action_due_date}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty icon="DocumentTextIcon" text="Nothing needs attention right now." />}
        </Board>
        <Board
          title="Ongoing Development"
          icon="BoltIcon"
          tone="amber"
          action={<Link className="text-xs font-semibold text-orange-500" href="/admin/pm/daily">Today&apos;s updates</Link>}
        >
          {(data?.ongoing || []).length ? (
            <table className="min-w-full">
              <thead><tr><Head>Project</Head><Head>Phase</Head><Head>%</Head><Head>RAG</Head><Head>Team</Head><Head>Deadline</Head><Head>Last update</Head><Head>Health</Head></tr></thead>
              <tbody>
                {(data?.ongoing || []).map((row: Record<string, string>) => (
                  <tr key={row.id}>
                    <Cell><Link className="font-medium text-secondary" href={`/admin/pm/projects/${row.id}`}>{row.project_name}</Link></Cell>
                    <Cell>{row.phase_name}</Cell>
                    <Cell>{row.completion_percent ?? '—'}</Cell>
                    <Cell><PmBadge value={row.latest_rag} /></Cell>
                    <Cell>{row.lead_developer_name || row.sr_engineer_name}</Cell>
                    <Cell>{row.effective_end}</Cell>
                    <Cell>{row.last_update}</Cell>
                    <Cell><PmBadge value={row.health} /></Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty icon="Cog6ToothIcon" text="No ongoing development items." />}
        </Board>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Board title="Account Manager Summary" icon="UsersIcon" tone="violet">
          {(data?.managers || []).length ? (
            <table className="min-w-full">
              <thead><tr><Head>AM</Head><Head>Ongoing</Head><Head>Planned</Head><Head>Delivered</Head><Head>Red</Head><Head>Pending</Head><Head>Total</Head></tr></thead>
              <tbody>
                {(data?.managers || []).map((row: Record<string, string | number>) => (
                  <tr key={String(row.name)}>
                    <Cell>{row.name}</Cell><Cell>{row.ongoing}</Cell><Cell>{row.planned}</Cell><Cell>{row.delivered}</Cell><Cell>{row.red}</Cell><Cell>{row.pending}</Cell><Cell>{row.total}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty icon="ChartBarIcon" text="No account manager data available." />}
        </Board>
        <Board title="Team Load" icon="UserGroupIcon" tone="amber">
          {(data?.teamLoad || []).length ? (
            <table className="min-w-full">
              <thead><tr><Head>Employee</Head><Head>Role</Head><Head>Ongoing</Head></tr></thead>
              <tbody>
                {(data?.teamLoad || []).map((row: Record<string, string | number>) => (
                  <tr key={`${row.name}-${row.role}`}>
                    <Cell>{row.name}</Cell><Cell>{row.role}</Cell><Cell>{row.count}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty icon="UsersIcon" text="No team load data available." />}
        </Board>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Board title="Recent Activity" icon="ClockIcon" tone="sky">
          {(data?.activity || []).length ? (
            <ul className="space-y-2 px-4 py-3 text-sm">
              {(data?.activity || []).map((row: { id: string; action: string; entity_type: string; created_at: string }) => (
                <li key={row.id}><span className="font-medium text-slate-800">{row.action}</span> <span className="text-slate-400">· {row.entity_type} · {String(row.created_at || '').slice(0, 16).replace('T', ' ')}</span></li>
              ))}
            </ul>
          ) : <Empty icon="DocumentTextIcon" text="No recent project activity." />}
        </Board>
        <Board title="Alerts" icon="BellAlertIcon" tone="amber">
          {(data?.alerts || []).length ? (
            <ul className="space-y-2 px-4 py-3 text-sm">
              {(data?.alerts || []).slice(0, 20).map((alert: { kind: string; project: string; detail?: string }, index: number) => (
                <li key={`${alert.kind}-${index}`}><span className="font-medium text-slate-800">{alert.kind}</span> <span className="text-slate-400">— {alert.project}{alert.detail ? ` · ${alert.detail}` : ''}</span></li>
              ))}
            </ul>
          ) : <Empty icon="BellAlertIcon" text="No project alerts." />}
        </Board>
      </div>
    </div>
  );
}
