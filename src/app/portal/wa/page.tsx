'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AddWhatsAppNumberDialog from '@/components/whatsapp/AddWhatsAppNumberDialog';
import CreateTemplateDialog from '@/components/whatsapp/CreateTemplateDialog';
import { HelpCard, Pill, SetupProgress, StatTile, activityCopy, formatWhen, setupItems, templateDisplayStatus } from '@/components/whatsapp/portal-ui';

type Workspace = {
  client?: { name?: string };
  session?: { companyName?: string; appId?: string };
  analytics?: { overview?: { sent?: number; deliveryRate?: number; readRate?: number; failed?: number } };
  setup?: { hasWaba?: boolean; hasPhone?: boolean; phoneCount?: number; templateCount?: number; ready?: boolean; connectionStatus?: string };
  phones?: unknown[];
  templates?: { id: string; name: string; body?: string; internal_status?: string; meta_status?: string }[];
  templateCount?: number;
  activity?: { event?: string; created_at?: string }[];
  error?: string;
};

export default function PortalDashboardPage() {
  const [data, setData] = useState<Workspace | null>(null);
  const [session, setSession] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = () => {
    Promise.all([
      fetch('/api/portal/wa/dashboard').then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Sign in to view your WhatsApp workspace.');
        return body;
      }),
      fetch('/api/public/wa-onboard/session', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([workspace, onboard]) => {
        setData(workspace);
        setSession(onboard);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  };

  useEffect(load, []);

  const name = data?.client?.name || session.companyName || 'there';
  const overview = data?.analytics?.overview || {};
  const setup = data?.setup || {};
  const connected = setup.connectionStatus === 'CONNECTED' || setup.ready;
  const items = setupItems({
    hasDetails: Boolean(session.companyName || data?.client?.name),
    hasWaba: setup.hasWaba,
    phoneCount: setup.phoneCount,
    templateCount: data?.templateCount || setup.templateCount,
    ready: setup.ready,
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] bg-slate-900 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/55 to-transparent" />
        <div className="relative grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Dashboard</p>
            <h1 className="mt-2 font-bricolage text-3xl font-bold sm:text-4xl">
              Welcome back,
              <br />
              <span className="text-orange-300">{name}!</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/75">
              Manage your WhatsApp Business API and grow your business with smarter conversations.
            </p>
          </div>
          <div className="rounded-3xl bg-white/95 p-5 text-slate-900 shadow-lg">
            <p className="text-4xl leading-none text-secondary">“</p>
            <p className="mt-2 font-bricolage text-lg font-semibold">turn conversations into customers.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${connected ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
            <Icon name="CheckIcon" size={12} />
          </span>
          WhatsApp Business API is {connected ? 'connected' : 'not fully connected'}
          <span className="text-slate-300">•</span>
          {setup.phoneCount || 0} number{(setup.phoneCount || 0) === 1 ? '' : 's'}
          <span className="text-slate-300">•</span>
          {data?.templateCount || 0} template{(data?.templateCount || 0) === 1 ? '' : 's'}
        </p>
        <Link href="/portal/wa/onboard" className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">
          Manage Setup <Icon name="ArrowRightIcon" size={14} />
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-rose-700">
          {error}{' '}
          <Link href="/login?next=/portal/wa" className="text-secondary underline">
            Sign in
          </Link>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Messages Sent" value={overview.sent ?? 0} hint="This month" icon="PaperAirplaneIcon" />
        <StatTile label="Delivery Rate" value={`${overview.deliveryRate ?? 0}%`} hint="This month" icon="CheckCircleIcon" tone="emerald" />
        <StatTile label="Read Rate" value={`${overview.readRate ?? 0}%`} hint="This month" icon="EyeIcon" tone="sky" />
        <StatTile label="Failed Messages" value={overview.failed ?? 0} hint="This month" icon="ExclamationTriangleIcon" tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon name="BoltIcon" size={16} className="text-secondary" />
            Quick Actions
          </div>
          <p className="mb-4 text-sm text-slate-500">Common tasks for managing your WhatsApp Business API.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Add Number', hint: 'Link or import a WhatsApp number', icon: 'HashtagIcon', onClick: () => setAddOpen(true) },
              { label: 'Manage Templates', hint: 'Create and sync message templates', icon: 'DocumentTextIcon', href: '/portal/wa/templates' },
              { label: 'View Inbox', hint: 'Read and reply to customer messages', icon: 'ChatBubbleLeftRightIcon', href: '/portal/wa/inbox' },
              { label: 'Account Settings', hint: 'Update your business and profile details', icon: 'Cog6ToothIcon', href: '/portal/wa/settings' },
            ].map((action) =>
              action.href ? (
                <Link key={action.label} href={action.href} className="rounded-2xl border border-slate-100 px-4 py-4 hover:border-secondary/40">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-white">
                    <Icon name={action.icon} size={16} />
                  </span>
                  <span className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-900">
                    {action.label} <Icon name="ArrowRightIcon" size={14} className="text-slate-300" />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{action.hint}</span>
                </Link>
              ) : (
                <button key={action.label} type="button" onClick={action.onClick} className="rounded-2xl border border-slate-100 px-4 py-4 text-left hover:border-secondary/40">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-white">
                    <Icon name={action.icon} size={16} />
                  </span>
                  <span className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-900">
                    {action.label} <Icon name="ArrowRightIcon" size={14} className="text-slate-300" />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{action.hint}</span>
                </button>
              ),
            )}
          </div>
        </div>
        <SetupProgress items={items} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Recent Activity</p>
            <Link href="/portal/wa/messages" className="text-xs font-semibold text-secondary">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.activity || []).slice(0, 4).map((row, index) => {
              const copy = activityCopy(row.event);
              return (
                <div key={`${row.event}-${index}`} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon name="CheckCircleIcon" size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{copy.title}</p>
                    <p className="text-xs text-slate-400">{copy.hint}</p>
                  </div>
                  <p className="ml-auto text-xs text-slate-400">{formatWhen(row.created_at)}</p>
                </div>
              );
            })}
            {!data?.activity?.length ? <p className="text-sm text-slate-400">Activity from Meta will appear here after sync.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Your Templates</p>
            <Link href="/portal/wa/templates" className="text-xs font-semibold text-secondary">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.templates || []).slice(0, 3).map((row) => {
              const status = templateDisplayStatus(row);
              return (
                <div key={row.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{row.name}</p>
                    <p className="line-clamp-1 text-xs text-slate-400">{row.body || 'WhatsApp message template'}</p>
                  </div>
                  <Pill label={status.label} tone={status.tone} />
                </div>
              );
            })}
            {!data?.templates?.length ? <p className="text-sm text-slate-400">No templates yet. Create one and request Meta approval.</p> : null}
            <button type="button" onClick={() => setTemplateOpen(true)} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-secondary">
              <Icon name="PlusIcon" size={14} /> Create New Template
            </button>
          </div>
        </div>
        <HelpCard />
      </div>

      {addOpen ? <AddWhatsAppNumberDialog session={session} onClose={() => setAddOpen(false)} onDone={load} /> : null}
      {templateOpen ? <CreateTemplateDialog onClose={() => setTemplateOpen(false)} onDone={load} /> : null}
    </div>
  );
}
