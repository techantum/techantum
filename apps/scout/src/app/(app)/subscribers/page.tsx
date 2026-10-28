import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';
import { listSubscribers } from '@/lib/saas/team';

export default async function SubscribersPage() {
  const actor = await getPlatformActor();
  if (!actor || !isSuperAdmin(actor.role)) redirect('/home');
  const rows = await listSubscribers();
  return (
    <div className="space-y-5">
      <h1 className="font-bricolage text-3xl font-bold text-slate-900">Subscribers</h1>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Seats</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </td>
                <td className="px-4 py-3 capitalize">{row.plan}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.seats_used}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={4}>No subscriber workspaces yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
