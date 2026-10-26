import { roleLabel } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';

export default async function SettingsPage() {
  const actor = await getPlatformActor();
  if (!actor) return null;
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-bricolage text-3xl font-bold text-slate-900">Settings</h1>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Signed in as</p>
        <p className="mt-2 font-semibold text-slate-900">{actor.name}</p>
        <p className="text-sm text-slate-500">{actor.email}</p>
        <p className="mt-3 text-sm text-slate-600">Role: {roleLabel(actor.role)}</p>
      </section>
      {actor.account ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
          <p className="mt-2 font-semibold text-slate-900">{actor.account.name}</p>
          <p className="text-sm text-slate-500">{actor.account.email}</p>
          <p className="mt-3 text-sm text-slate-600">Plan: {actor.account.plan} · Status: {actor.account.status}</p>
          {actor.account.trial_ends_at ? <p className="mt-1 text-sm text-slate-500">Trial ends {new Date(actor.account.trial_ends_at).toLocaleString('en-IN')}</p> : null}
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Platform workspace. YouTube API settings stay on YouTube Settings, the same Super Admin screen as Techantum.</p>
        </section>
      )}
    </div>
  );
}
