import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { isSuperAdmin, isSubscriberAdmin } from '@/lib/admin/roles';
import { FEATURE_TEAM, listFeatures, platformDashboard, resolveAccess } from '@/lib/saas/catalog';
import { formatInr, monthDelta, packageIconTone, planTone, timeAgo } from '@/lib/saas/money';
import { getPlatformActor } from '@/lib/saas/session';

function eventCopy(row: { event_type: string; account_name: string | null; to_name: string | null; from_name: string | null }) {
  const workspace = row.account_name || 'A workspace';
  if (row.event_type === 'upgraded') return { icon: 'ArrowTrendingUpIcon', tone: 'bg-emerald-50 text-emerald-700', title: `${workspace} upgraded`, detail: row.to_name ? `Moved to ${row.to_name}` : 'Package upgraded' };
  if (row.event_type === 'downgraded') return { icon: 'ArrowTrendingDownIcon', tone: 'bg-amber-50 text-amber-700', title: `${workspace} scheduled a change`, detail: row.to_name ? `Next plan: ${row.to_name}` : 'Package change pending' };
  if (row.event_type === 'canceled') return { icon: 'XCircleIcon', tone: 'bg-rose-50 text-rose-700', title: `${workspace} canceled`, detail: row.from_name || 'Subscription canceled' };
  if (row.event_type === 'assigned') return { icon: 'SparklesIcon', tone: 'bg-violet-50 text-violet-700', title: `${workspace} started`, detail: row.to_name ? `Assigned ${row.to_name}` : 'Package assigned' };
  return { icon: 'ClockIcon', tone: 'bg-slate-100 text-slate-600', title: `${workspace} · ${row.event_type}`, detail: row.to_name || row.from_name || 'Subscription event' };
}

function initials(name?: string | null, email?: string | null) {
  const text = String(name || email || 'W').trim();
  const parts = text.split(/\s+/);
  return ((parts[0]?.[0] || 'W') + (parts[1]?.[0] || '')).toUpperCase();
}

export default async function HomePage() {
  const actor = await getPlatformActor();
  if (!actor) return null;
  const access = await resolveAccess(actor.account, actor.role);
  const admin = isSuperAdmin(actor.role);

  if (admin) {
    const dash = await platformDashboard();
    const pkgDelta = monthDelta(dash.totals.workspacesThisMonth, dash.totals.workspacesLastMonth);
    const subDelta = monthDelta(dash.totals.subscribersThisMonth, dash.totals.subscribersLastMonth);
    const activePackages = dash.packages.filter((item) => item.status === 'active');
    const packageTotal = Math.max(activePackages.length, 1);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-500">Live packages, subscriber workspaces, and catalog features from the database.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: '/subscriptions/packages', icon: 'CubeIcon', tone: 'bg-violet-50 text-violet-600', label: 'Total packages', value: dash.totals.packages, hint: `${dash.totals.packagesActive} active` },
            { href: '/subscribers', icon: 'UserGroupIcon', tone: 'bg-emerald-50 text-emerald-600', label: 'Active subscribers', value: dash.totals.workspacesActive, hint: subDelta?.text || `${dash.totals.workspaces} workspaces` },
            { href: '/subscriptions/features', icon: 'Squares2X2Icon', tone: 'bg-sky-50 text-sky-600', label: 'Catalog features', value: dash.totals.features, hint: `${dash.totals.assignedFeatures} assigned to packages` },
            { href: '/subscribers', icon: 'BuildingOffice2Icon', tone: 'bg-amber-50 text-amber-600', label: 'Active workspaces', value: dash.totals.workspacesActive, hint: pkgDelta?.text || `${dash.totals.workspacesThisMonth} created this month` },
          ].map((card) => (
            <Link key={card.label} href={card.href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-violet-200">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon name={card.icon} size={18} />
              </span>
              <p className="mt-3 font-bricolage text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm font-semibold text-slate-700">{card.label}</p>
              <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon name="CubeIcon" size={16} className="text-violet-600" /> Package overview</p>
                <p className="mt-1 text-xs text-slate-400">Prices and subscriber counts from live packages.</p>
              </div>
              <Link href="/subscriptions/packages" className="text-sm font-semibold text-violet-700">View all packages →</Link>
            </div>
            {activePackages.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {activePackages.slice(0, 3).map((item, index) => (
                  <article key={item.id} className={`rounded-2xl border p-4 ${item.highlight ? 'border-violet-200 bg-violet-50/60' : 'border-slate-100 bg-slate-50/70'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${packageIconTone(item.name, index)}`}>
                        <Icon name={item.icon || 'CubeIcon'} size={16} />
                      </span>
                      {item.highlight ? <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Highlighted</span> : null}
                    </div>
                    <h2 className="mt-3 font-bricolage text-lg font-semibold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-sm text-violet-700">{formatInr(item.price_monthly, { withCycle: item.billing_cycle })}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.features.length} features · {item.subscriber_count} active subscribers</p>
                    <Link href="/subscriptions/packages" className={`mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl text-sm font-semibold ${item.highlight ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 ring-1 ring-violet-200'}`}>
                      Manage package
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-500">No packages in the catalog yet.</p>
                <Link href="/subscriptions/packages" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700">Create a package →</Link>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon name="BoltIcon" size={16} className="text-violet-600" /> Quick actions</p>
            <div className="mt-4 space-y-2">
              {[
                { href: '/subscriptions/packages', icon: 'PlusCircleIcon', tone: 'bg-violet-50 text-violet-600', title: 'Add package', hint: 'Create a subscription package' },
                { href: '/subscriptions/features', icon: 'Squares2X2Icon', tone: 'bg-emerald-50 text-emerald-600', title: 'Manage features', hint: 'Configure catalog apps in the sidebar' },
                { href: '/subscribers', icon: 'UserPlusIcon', tone: 'bg-sky-50 text-sky-600', title: 'Subscriber workspaces', hint: 'Open subscriber accounts and seats' },
                { href: '/subscriptions', icon: 'CreditCardIcon', tone: 'bg-amber-50 text-amber-600', title: 'View subscriptions', hint: 'Assign or change workspace plans' },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-50">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                    <span className="block text-xs text-slate-400">{item.hint}</span>
                  </span>
                  <Icon name="ChevronRightIcon" size={16} className="text-slate-300" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-1">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon name="UsersIcon" size={16} className="text-violet-600" /> Recent subscribers</p>
              <Link href="/subscribers" className="text-sm font-semibold text-violet-700">View all →</Link>
            </div>
            <ul className="mt-4 space-y-3">
              {dash.recentSubscribers.map((row) => (
                <li key={row.id} className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">{initials(row.name, row.email)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{row.name}</span>
                    <span className="block truncate text-xs text-slate-400">{row.email}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${planTone(row.package_name || row.plan)}`}>{row.package_name || row.plan || '—'}</span>
                </li>
              ))}
              {!dash.recentSubscribers.length ? <li className="text-sm text-slate-500">No subscriber workspaces yet. <Link href="/subscribers" className="font-semibold text-violet-700">Open subscribers</Link></li> : null}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon name="Squares2X2Icon" size={16} className="text-violet-600" /> Feature access</p>
              <Link href="/subscriptions/features" className="text-sm font-semibold text-violet-700">View details →</Link>
            </div>
            <ul className="mt-4 space-y-3">
              {dash.coverage.map((feature) => {
                const count = Number(feature.package_count || 0);
                const pct = Math.round((count / packageTotal) * 100);
                return (
                  <li key={feature.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-700">
                        <Icon name={feature.icon || 'Squares2X2Icon'} size={16} className="text-violet-500" />
                        <span className="truncate">{feature.sidebar_label || feature.name}</span>
                      </span>
                      <span className="text-xs text-slate-400">{count}/{activePackages.length} packages</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
              {!dash.coverage.length ? <li className="text-sm text-slate-500">No catalog features yet. <Link href="/subscriptions/features" className="font-semibold text-violet-700">Add features</Link></li> : null}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon name="ClockIcon" size={16} className="text-violet-600" /> Recent activity</p>
            <ul className="mt-4 space-y-3">
              {dash.events.map((row, index) => {
                const copy = eventCopy(row);
                return (
                  <li key={`${row.created_at}-${index}`} className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${copy.tone}`}>
                      <Icon name={copy.icon} size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{copy.title}</span>
                      <span className="block text-xs text-slate-400">{copy.detail}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{timeAgo(row.created_at)}</span>
                  </li>
                );
              })}
              {!dash.events.length ? <li className="text-sm text-slate-500">Subscription changes will appear here.</li> : null}
            </ul>
          </section>
        </div>
      </div>
    );
  }

  const catalog = await listFeatures(false).catch(() => []);
  const included = access.features.filter((feature) => feature.feature_key !== FEATURE_TEAM || isSubscriberAdmin(actor.role));
  const missing = catalog.filter((feature) => {
    if (access.has(feature.feature_key)) return false;
    if (feature.feature_key === FEATURE_TEAM && !isSubscriberAdmin(actor.role)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Welcome, {actor.name}</h1>
        <p className="mt-1 text-slate-500">
          {access.active
            ? `Your ${access.package?.name || 'workspace'} package includes ${included.map((item) => item.name).join(', ') || 'no extra modules yet'}.`
            : 'Your trial or subscription is not active. Open Billing to choose a package.'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {included.map((feature) => (
          <Link key={feature.id} href={feature.route} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-violet-200">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600"><Icon name={feature.icon} size={16} /> {feature.sidebar_label}</p>
            <h2 className="mt-2 font-bricolage text-xl font-semibold">{feature.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{feature.description}</p>
            <p className="mt-4 text-sm font-semibold text-violet-700">Open {feature.sidebar_label} →</p>
          </Link>
        ))}
        {isSubscriberAdmin(actor.role) ? (
          <Link href="/billing" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-violet-200">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600"><Icon name="CreditCardIcon" size={16} /> Billing</p>
            <h2 className="mt-2 font-bricolage text-xl font-semibold">Manage your package</h2>
            <p className="mt-2 text-sm text-slate-500">See your active plan in Indian rupees and upgrade to unlock missing apps.</p>
            <p className="mt-4 text-sm font-semibold text-violet-700">Open billing →</p>
          </Link>
        ) : null}
      </div>
      {missing.length ? (
        <section className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5">
          <p className="text-sm font-semibold text-amber-900">Apps missing from your package</p>
          <p className="mt-1 text-sm text-amber-800">These catalog apps are in the sidebar as Missing until they are included in your plan.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {missing.map((feature) => (
              <Link key={feature.id} href={`/billing?need=${feature.feature_key}`} className="rounded-2xl border border-amber-100 bg-white p-4 hover:border-amber-300">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon name={feature.icon} size={16} className="text-amber-600" /> {feature.sidebar_label}</p>
                <p className="mt-2 text-xs text-slate-500">{feature.description || 'Not included in the current package.'}</p>
                <p className="mt-3 text-sm font-semibold text-amber-700">Unlock in billing →</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
