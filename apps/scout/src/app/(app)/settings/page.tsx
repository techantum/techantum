import Link from 'next/link';
import { isSuperAdmin } from '@/lib/admin/roles';
import HookoohSettingsPanel from '@/components/hookooh/HookoohSettingsPanel';
import { canManageHookoohKnowledge } from '@/lib/hookooh/access';
import { formatInr } from '@/lib/saas/money';
import { resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';

export default async function SettingsPage() {
  const actor = await getPlatformActor();
  if (!actor) return null;
  const access = await resolveAccess(actor.account, actor.role);
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-bricolage text-3xl font-bold text-slate-900">Settings</h1>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Signed in as</p>
        <p className="mt-2 font-semibold text-slate-900">{actor.name}</p>
        <p className="text-sm text-slate-500">{actor.email}</p>
      </section>
      {actor.account ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
          <p className="mt-2 font-semibold text-slate-900">{actor.account.name}</p>
          <p className="text-sm text-slate-500">{actor.account.email}</p>
          <p className="mt-3 text-sm text-slate-600">Package: {access.package?.name || actor.account.plan} · {formatInr(access.priceMonthly)} / month · Status: {actor.account.status}</p>
          {actor.account.trial_ends_at ? <p className="mt-1 text-sm text-slate-500">Trial ends {new Date(actor.account.trial_ends_at).toLocaleString('en-IN')}</p> : null}
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Platform workspace. YouTube API credentials are managed under YouTube Settings.</p>
          {isSuperAdmin(actor.role) ? (
            <Link href="/youtube/settings" className="mt-3 inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
              Open YouTube Settings
            </Link>
          ) : null}
        </section>
      )}
      {isSuperAdmin(actor.role) ? <HookoohSettingsPanel /> : null}
      {!isSuperAdmin(actor.role) && canManageHookoohKnowledge(actor.role) ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Hookooh</h2>
          <p className="mt-1 text-sm text-slate-500">Train Hookooh AI Agent with approved YouTube knowledge.</p>
          <Link href="/youtube/ai-training" className="mt-3 inline-flex rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white">
            Open knowledge library
          </Link>
        </section>
      ) : null}
    </div>
  );
}
