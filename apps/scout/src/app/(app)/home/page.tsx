import Link from 'next/link';
import { isSuperAdmin, isSubscriberAdmin, roleLabel } from '@/lib/admin/roles';
import { entitlementsFor, getPlatformActor } from '@/lib/saas/session';

export default async function HomePage() {
  const actor = await getPlatformActor();
  if (!actor) return null;
  const access = entitlementsFor(actor.account);
  const admin = isSuperAdmin(actor.role);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Welcome, {actor.name}</h1>
        <p className="mt-1 text-slate-500">
          {admin
            ? 'You are signed in as Super Admin. YouTube Settings, research, and lead discovery work the same as in Techantum.'
            : access.active
              ? `Signed in as ${roleLabel(actor.role)}. Your ${access.plan.name} workspace includes ${access.youtube ? 'YouTube research and ' : ''}lead discovery.`
              : 'Your trial or subscription is not active. Ask a Subscriber Admin to open Billing.'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/youtube" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-200">
          <p className="text-sm font-semibold text-indigo-600">YouTube Research</p>
          <h2 className="mt-2 font-bricolage text-xl font-semibold">Compare videos and competitors</h2>
          <p className="mt-2 text-sm text-slate-500">{access.youtube ? 'Open projects, fetch public videos, and run comparisons.' : 'Available on Growth and Scale.'}</p>
        </Link>
        <Link href="/leads" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-200">
          <p className="text-sm font-semibold text-indigo-600">Lead Discovery</p>
          <h2 className="mt-2 font-bricolage text-xl font-semibold">Find local businesses</h2>
          <p className="mt-2 text-sm text-slate-500">{access.leads ? 'Search Google Places and export lists.' : 'Not on this plan.'}</p>
        </Link>
        {admin ? (
          <Link href="/youtube/settings" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-200">
            <p className="text-sm font-semibold text-indigo-600">YouTube Settings</p>
            <h2 className="mt-2 font-bricolage text-xl font-semibold">API key and module access</h2>
            <p className="mt-2 text-sm text-slate-500">Same Super Admin controls as Techantum YouTube Research settings.</p>
          </Link>
        ) : null}
        {isSubscriberAdmin(actor.role) ? (
          <Link href="/team" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-200">
            <p className="text-sm font-semibold text-indigo-600">Team</p>
            <h2 className="mt-2 font-bricolage text-xl font-semibold">Subscriber Admin and Subscriber User</h2>
            <p className="mt-2 text-sm text-slate-500">Invite people. Admins manage billing and the team. Users run research and leads.</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
