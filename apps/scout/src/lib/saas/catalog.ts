import { cache } from 'react';
import { q } from '@/lib/finance/db';
import { FinanceValidationError } from '@/lib/finance/errors';
import { isSuperAdmin, type PlatformRole } from '@/lib/admin/roles';
import { canManageHookoohKnowledge } from '@/lib/hookooh/access';
import { accountIsActive, type SaasAccount } from './session';

export const FEATURE_YOUTUBE = 'youtube_research';
export const FEATURE_LEADS = 'lead_discovery';
export const FEATURE_TEAM = 'team_management';
export const TRIAL_PACKAGE_SLUG = 'growth';

export type CatalogFeature = {
  id: string;
  feature_key: string;
  name: string;
  sidebar_label: string;
  description: string;
  icon: string;
  route: string;
  status: 'active' | 'inactive';
  sort_order: number;
  limit_config: Record<string, unknown>;
};

export type CatalogPackage = {
  id: string;
  slug: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'inactive';
  description_html: string;
  short_description: string;
  icon: string;
  highlight: boolean;
  seats: number | null;
  sort_order: number;
  feature_ids: string[];
  features: CatalogFeature[];
  subscriber_count: number;
};

export type Access = {
  active: boolean;
  keys: string[];
  features: CatalogFeature[];
  seats: number;
  package: CatalogPackage | null;
  priceMonthly: number;
  periodEnd: string | null;
  pendingPackageId: string | null;
  pendingChangeAt: string | null;
  subscriptionStatus: string;
  has(key: string): boolean;
};

function asInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseLimits(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || `package-${Date.now()}`;
}

function keyify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

export async function listFeatures(includeInactive = true) {
  const { rows } = await q<CatalogFeature>(
    undefined,
    `SELECT id, feature_key, name, sidebar_label, description, icon, route, status, sort_order, limit_config
     FROM saas_features
     ${includeInactive ? '' : "WHERE status = 'active'"}
     ORDER BY sort_order, name`
  );
  return rows.map((row) => ({ ...row, limit_config: parseLimits(row.limit_config) }));
}

export async function saveFeature(input: Partial<CatalogFeature> & { id?: string }) {
  const name = String(input.name || '').trim();
  if (!name) throw new FinanceValidationError('Enter feature name');
  const featureKey = String(input.feature_key || keyify(name)).trim();
  if (!featureKey) throw new FinanceValidationError('Enter feature key');
  const route = String(input.route || '').trim();
  if (!route.startsWith('/')) throw new FinanceValidationError('Enter a route starting with /');
  const payload = [
    featureKey,
    name,
    String(input.sidebar_label || name).trim(),
    String(input.description || '').trim(),
    String(input.icon || 'Squares2X2Icon'),
    route,
    input.status === 'inactive' ? 'inactive' : 'active',
    asInt(input.sort_order, 100),
    JSON.stringify(input.limit_config || {}),
  ];
  if (input.id) {
    const { rows } = await q<CatalogFeature>(
      undefined,
      `UPDATE saas_features SET feature_key=$2, name=$3, sidebar_label=$4, description=$5, icon=$6, route=$7, status=$8, sort_order=$9, limit_config=$10::jsonb, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [input.id, ...payload]
    );
    return rows[0];
  }
  const { rows } = await q<CatalogFeature>(
    undefined,
    `INSERT INTO saas_features (feature_key, name, sidebar_label, description, icon, route, status, sort_order, limit_config)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
    payload
  );
  return rows[0];
}

async function attachFeatures(packages: Array<Omit<CatalogPackage, 'features' | 'feature_ids'> & { feature_ids?: string[] }>) {
  if (!packages.length) return [] as CatalogPackage[];
  const ids = packages.map((item) => item.id);
  const { rows } = await q<{ package_id: string } & CatalogFeature>(
    undefined,
    `SELECT pf.package_id, f.id, f.feature_key, f.name, f.sidebar_label, f.description, f.icon, f.route, f.status, f.sort_order, f.limit_config
     FROM saas_package_features pf
     JOIN saas_features f ON f.id = pf.feature_id
     WHERE pf.package_id = ANY($1::uuid[])
     ORDER BY f.sort_order, f.name`,
    [ids]
  );
  const byPackage = new Map<string, CatalogFeature[]>();
  for (const row of rows) {
    const list = byPackage.get(row.package_id) || [];
    list.push({ ...row, limit_config: parseLimits(row.limit_config) });
    byPackage.set(row.package_id, list);
  }
  return packages.map((item) => {
    const features = byPackage.get(item.id) || [];
    return { ...item, features, feature_ids: features.map((feature) => feature.id) };
  });
}

export async function listPackages(options?: { activeOnly?: boolean }) {
  const { rows } = await q<Omit<CatalogPackage, 'features' | 'feature_ids'>>(
    undefined,
    `SELECT p.*, COALESCE((
        SELECT COUNT(*) FROM saas_accounts a
        WHERE a.package_id = p.id AND a.status IN ('active', 'trialing')
      ), 0)::int AS subscriber_count
     FROM saas_packages p
     ${options?.activeOnly ? "WHERE p.status = 'active'" : ''}
     ORDER BY p.sort_order, p.price_monthly`
  );
  return attachFeatures(
    rows.map((row) => ({
      ...row,
      short_description: String(row.short_description || ''),
      price_monthly: asInt(row.price_monthly),
      price_yearly: row.price_yearly == null ? null : asInt(row.price_yearly),
      seats: row.seats == null ? null : asInt(row.seats),
      subscriber_count: asInt(row.subscriber_count),
    }))
  );
}

export async function getPackageById(id: string) {
  const all = await listPackages();
  return all.find((item) => item.id === id) || null;
}

export async function getPackageBySlug(slug: string) {
  const all = await listPackages();
  const mapped = slug === 'scale' ? 'business' : slug;
  return all.find((item) => item.slug === mapped) || null;
}

export async function savePackage(input: {
  id?: string;
  name: string;
  slug?: string;
  price_monthly: number;
  price_yearly?: number | null;
  billing_cycle?: 'monthly' | 'yearly';
  status?: 'active' | 'inactive';
  description_html?: string;
  short_description?: string;
  icon?: string;
  highlight?: boolean;
  seats?: number | null;
  sort_order?: number;
  feature_ids?: string[];
}) {
  const name = String(input.name || '').trim();
  if (!name) throw new FinanceValidationError('Enter package name');
  const price = asInt(input.price_monthly, -1);
  if (price < 0) throw new FinanceValidationError('Enter package price');
  const slug = slugify(input.slug || name);
  const values = [
    slug,
    name,
    price,
    input.price_yearly == null || input.price_yearly === undefined ? null : asInt(input.price_yearly),
    input.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
    input.status === 'inactive' ? 'inactive' : 'active',
    String(input.description_html || ''),
    String(input.short_description || '').trim(),
    String(input.icon || 'CubeIcon'),
    Boolean(input.highlight),
    input.seats == null || input.seats === undefined ? null : asInt(input.seats),
    asInt(input.sort_order, 100),
  ];
  let id = input.id;
  if (id) {
    await q(
      undefined,
      `UPDATE saas_packages SET slug=$2, name=$3, price_monthly=$4, price_yearly=$5, billing_cycle=$6, status=$7, description_html=$8, short_description=$9, icon=$10, highlight=$11, seats=$12, sort_order=$13, updated_at=NOW()
       WHERE id=$1`,
      [id, ...values]
    );
  } else {
    const inserted = await q<{ id: string }>(
      undefined,
      `INSERT INTO saas_packages (slug, name, price_monthly, price_yearly, billing_cycle, status, description_html, short_description, icon, highlight, seats, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      values
    );
    id = inserted.rows[0].id;
  }
  await q(undefined, `DELETE FROM saas_package_features WHERE package_id=$1`, [id]);
  for (const featureId of input.feature_ids || []) {
    await q(undefined, `INSERT INTO saas_package_features (package_id, feature_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, featureId]);
  }
  return getPackageById(id as string);
}

export async function trialPackage() {
  return (await getPackageBySlug(TRIAL_PACKAGE_SLUG)) || (await listPackages({ activeOnly: true }))[0] || null;
}

type SubRow = {
  id: string;
  account_id: string;
  package_id: string;
  price_monthly: string | number;
  billing_cycle: string;
  status: string;
  current_period_end: string | null;
  pending_package_id: string | null;
  pending_change_at: string | null;
};

export async function currentSubscription(accountId: string) {
  const { rows } = await q<SubRow>(
    undefined,
    `SELECT * FROM saas_subscriptions
     WHERE account_id=$1 AND status IN ('trialing','active','pending_downgrade')
     ORDER BY created_at DESC LIMIT 1`,
    [accountId]
  );
  return rows[0] || null;
}

export async function recordEvent(input: {
  subscriptionId?: string | null;
  accountId: string;
  type: string;
  fromPackageId?: string | null;
  toPackageId?: string | null;
  payload?: Record<string, unknown>;
  createdBy?: string | null;
}) {
  await q(
    undefined,
    `INSERT INTO saas_subscription_events (subscription_id, account_id, event_type, from_package_id, to_package_id, payload, created_by)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [input.subscriptionId || null, input.accountId, input.type, input.fromPackageId || null, input.toPackageId || null, JSON.stringify(input.payload || {}), input.createdBy || null]
  );
}

export async function assignPackageToAccount(account: Pick<SaasAccount, 'id' | 'status' | 'current_period_end'>, pkg: CatalogPackage, createdBy?: string | null, eventType = 'assigned') {
  const period = account.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString();
  const status = account.status === 'trialing' ? 'trialing' : 'active';
  await q(undefined, `UPDATE saas_subscriptions SET status='expired', updated_at=NOW() WHERE account_id=$1 AND status IN ('trialing','active','pending_downgrade')`, [account.id]);
  const inserted = await q<{ id: string }>(
    undefined,
    `INSERT INTO saas_subscriptions (account_id, package_id, price_monthly, billing_cycle, status, current_period_end)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [account.id, pkg.id, pkg.price_monthly, pkg.billing_cycle, status, period]
  );
  await q(
    undefined,
    `UPDATE saas_accounts SET package_id=$2, plan=$3, contracted_price_monthly=$4, current_period_end=$5, status=CASE WHEN status='canceled' THEN 'active' ELSE status END, updated_at=NOW() WHERE id=$1`,
    [account.id, pkg.id, pkg.slug, pkg.price_monthly, period]
  );
  await recordEvent({
    subscriptionId: inserted.rows[0].id,
    accountId: account.id,
    type: eventType,
    toPackageId: pkg.id,
    payload: { price_monthly: pkg.price_monthly, name: pkg.name },
    createdBy,
  });
  return inserted.rows[0].id;
}

export async function changeAccountPackage(account: SaasAccount, packageId: string, createdBy: string) {
  const next = await getPackageById(packageId);
  if (!next || next.status !== 'active') throw new FinanceValidationError('That package is not available.');
  const current = await currentSubscription(account.id);
  const currentPkg = current ? await getPackageById(current.package_id) : await getPackageBySlug(account.plan);
  const currentPrice = current ? asInt(current.price_monthly) : currentPkg?.price_monthly || 0;
  const upgrade = next.price_monthly >= currentPrice;
  if (!upgrade) {
    const changeAt = current?.current_period_end || account.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString();
    if (current) {
      await q(
        undefined,
        `UPDATE saas_subscriptions SET status='pending_downgrade', pending_package_id=$2, pending_change_at=$3, updated_at=NOW() WHERE id=$1`,
        [current.id, next.id, changeAt]
      );
      await recordEvent({
        subscriptionId: current.id,
        accountId: account.id,
        type: 'downgrade_scheduled',
        fromPackageId: current.package_id,
        toPackageId: next.id,
        payload: { effective_at: changeAt, current_price: currentPrice, next_price: next.price_monthly },
        createdBy,
      });
    } else {
      await assignPackageToAccount(account, next, createdBy, 'downgraded');
    }
    return { immediate: false, effectiveAt: changeAt, package: next, from: currentPkg };
  }
  await assignPackageToAccount({ ...account, status: 'active' }, next, createdBy, current ? 'upgraded' : 'assigned');
  return { immediate: true, effectiveAt: new Date().toISOString(), package: next, from: currentPkg };
}

export const resolveAccess = cache(async (account: SaasAccount | null | undefined, role?: PlatformRole | null): Promise<Access> => {
  const has = (keys: string[]) => (key: string) => keys.includes(key);
  if (!account || isSuperAdmin(role)) {
    const features = await listFeatures(false).catch(() => []);
    const keys = features.map((item) => item.feature_key);
    return {
      active: true,
      keys,
      features,
      seats: 10_000,
      package: null,
      priceMonthly: 0,
      periodEnd: null,
      pendingPackageId: null,
      pendingChangeAt: null,
      subscriptionStatus: 'platform',
      has: has(keys.length ? keys : [FEATURE_YOUTUBE, FEATURE_LEADS, FEATURE_TEAM]),
    };
  }
  const active = accountIsActive(account);
  const sub = await currentSubscription(account.id).catch(() => null);
  const pkg =
    (sub ? await getPackageById(sub.package_id) : null) ||
    (account.package_id ? await getPackageById(account.package_id) : null) ||
    (await getPackageBySlug(account.plan));
  const features = active && pkg ? pkg.features.filter((item) => item.status === 'active') : [];
  const keys = features.map((item) => item.feature_key);
  return {
    active,
    keys,
    features,
    seats: pkg?.seats == null ? 10_000 : pkg.seats,
    package: pkg,
    priceMonthly: sub ? asInt(sub.price_monthly) : pkg?.price_monthly || 0,
    periodEnd: sub?.current_period_end || account.current_period_end,
    pendingPackageId: sub?.pending_package_id || null,
    pendingChangeAt: sub?.pending_change_at || null,
    subscriptionStatus: sub?.status || account.status,
    has: has(keys),
  };
});

export async function listSubscriptionRows() {
  const { rows } = await q<{
    id: string;
    name: string;
    email: string;
    status: string;
    plan: string;
    package_id: string | null;
    package_name: string | null;
    price_monthly: string | number | null;
    billing_cycle: string | null;
    current_period_end: string | null;
    seats_used: string;
    subscription_status: string | null;
    started_at: string | null;
  }>(
    undefined,
    `SELECT a.id, a.name, a.email, a.status, a.plan, a.package_id, p.name AS package_name,
            COALESCE(s.price_monthly, a.contracted_price_monthly, p.price_monthly) AS price_monthly,
            COALESCE(s.billing_cycle, p.billing_cycle, 'monthly') AS billing_cycle,
            COALESCE(s.current_period_end, a.current_period_end)::text AS current_period_end,
            (SELECT COUNT(*)::text FROM saas_memberships m WHERE m.account_id = a.id) AS seats_used,
            s.status AS subscription_status,
            COALESCE(s.created_at, a.created_at)::text AS started_at
     FROM saas_accounts a
     LEFT JOIN saas_packages p ON p.id = COALESCE(a.package_id, (SELECT package_id FROM saas_subscriptions x WHERE x.account_id=a.id ORDER BY created_at DESC LIMIT 1))
     LEFT JOIN LATERAL (
       SELECT * FROM saas_subscriptions s2
       WHERE s2.account_id = a.id
       ORDER BY s2.created_at DESC
       LIMIT 1
     ) s ON TRUE
     ORDER BY a.created_at DESC`
  );
  return rows;
}

export async function listEvents(accountId: string) {
  const { rows } = await q<{
    id: string;
    event_type: string;
    created_at: string;
    payload: unknown;
    from_name: string | null;
    to_name: string | null;
  }>(
    undefined,
    `SELECT e.id, e.event_type, e.created_at::text, e.payload, f.name AS from_name, t.name AS to_name
     FROM saas_subscription_events e
     LEFT JOIN saas_packages f ON f.id = e.from_package_id
     LEFT JOIN saas_packages t ON t.id = e.to_package_id
     WHERE e.account_id=$1
     ORDER BY e.created_at DESC
     LIMIT 20`,
    [accountId]
  );
  return rows;
}

export type NavItem = { href: string; label: string; icon: string; key?: string; locked?: boolean; children?: NavItem[] };

function youtubeNavChildren(locked = false, role?: PlatformRole): NavItem[] {
  const billing = '/billing?need=youtube';
  const children: NavItem[] = [
    { href: locked ? billing : '/youtube', label: 'Dashboard', icon: 'Squares2X2Icon', key: 'yt-dashboard' },
    { href: locked ? billing : '/youtube/projects', label: 'Projects', icon: 'FolderIcon', key: 'yt-projects' },
    { href: locked ? billing : '/youtube/quick-analysis', label: 'Quick Analysis', icon: 'BoltIcon', key: 'yt-quick-analysis' },
    { href: locked ? billing : '/youtube/quick-reports', label: 'Quick Reports', icon: 'DocumentChartBarIcon', key: 'yt-quick-reports' },
  ];
  if (!locked && canManageHookoohKnowledge(role)) {
    children.push({ href: '/youtube/ai-training', label: 'Hookooh', icon: 'SparklesIcon', key: 'yt-hookooh' });
  }
  if (!locked && isSuperAdmin(role)) {
    children.push({ href: '/youtube/hookooh', label: 'Hookooh Settings', icon: 'Cog6ToothIcon', key: 'yt-hookooh-settings' });
  }
  return children;
}

function withYoutubeChildren(item: NavItem, role?: PlatformRole): NavItem {
  if (item.key !== FEATURE_YOUTUBE && item.href !== '/youtube' && !item.href.startsWith('/billing?need=youtube')) return item;
  return { ...item, children: youtubeNavChildren(Boolean(item.locked), role) };
}

export async function platformDashboard() {
  const [packages, features, subscriptions, counts, coverage, events] = await Promise.all([
    listPackages(),
    listFeatures(false),
    listSubscriptionRows(),
    q<{
      packages: string;
      packages_active: string;
      workspaces: string;
      workspaces_active: string;
      workspaces_this_month: string;
      workspaces_last_month: string;
      features: string;
      assigned_features: string;
      subscribers_this_month: string;
      subscribers_last_month: string;
    }>(
      undefined,
      `SELECT
         (SELECT COUNT(*) FROM saas_packages)::text AS packages,
         (SELECT COUNT(*) FROM saas_packages WHERE status='active')::text AS packages_active,
         (SELECT COUNT(*) FROM saas_accounts)::text AS workspaces,
         (SELECT COUNT(*) FROM saas_accounts WHERE status IN ('active','trialing'))::text AS workspaces_active,
         (SELECT COUNT(*) FROM saas_accounts WHERE created_at >= date_trunc('month', NOW()))::text AS workspaces_this_month,
         (SELECT COUNT(*) FROM saas_accounts WHERE created_at >= date_trunc('month', NOW() - interval '1 month') AND created_at < date_trunc('month', NOW()))::text AS workspaces_last_month,
         (SELECT COUNT(*) FROM saas_features WHERE status='active')::text AS features,
         (SELECT COUNT(DISTINCT feature_id) FROM saas_package_features)::text AS assigned_features,
         (SELECT COUNT(*) FROM saas_accounts WHERE status IN ('active','trialing') AND created_at >= date_trunc('month', NOW()))::text AS subscribers_this_month,
         (SELECT COUNT(*) FROM saas_accounts WHERE status IN ('active','trialing') AND created_at >= date_trunc('month', NOW() - interval '1 month') AND created_at < date_trunc('month', NOW()))::text AS subscribers_last_month`
    ).catch(() => ({ rows: [{} as any] })),
    q<{ id: string; name: string; feature_key: string; icon: string; route: string; sidebar_label: string; package_count: string }>(
      undefined,
      `SELECT f.id, f.name, f.feature_key, f.icon, f.route, f.sidebar_label,
              COUNT(pf.package_id) FILTER (WHERE p.status = 'active')::text AS package_count
       FROM saas_features f
       LEFT JOIN saas_package_features pf ON pf.feature_id = f.id
       LEFT JOIN saas_packages p ON p.id = pf.package_id
       WHERE f.status = 'active'
       GROUP BY f.id
       ORDER BY f.sort_order, f.name`
    ).catch(() => ({ rows: [] as any[] })),
    q<{ event_type: string; created_at: string; account_name: string | null; email: string | null; to_name: string | null; from_name: string | null }>(
      undefined,
      `SELECT e.event_type, e.created_at::text, a.name AS account_name, a.email, t.name AS to_name, f.name AS from_name
       FROM saas_subscription_events e
       JOIN saas_accounts a ON a.id = e.account_id
       LEFT JOIN saas_packages t ON t.id = e.to_package_id
       LEFT JOIN saas_packages f ON f.id = e.from_package_id
       ORDER BY e.created_at DESC
       LIMIT 8`
    ).catch(() => ({ rows: [] as any[] })),
  ]);
  const row = counts.rows[0] || {};
  const activeWorkspaces = subscriptions.filter((item) => ['active', 'trialing'].includes(item.subscription_status || item.status));
  return {
    packages,
    features,
    subscriptions,
    activeWorkspaces,
    recentSubscribers: subscriptions.slice(0, 6),
    coverage: coverage.rows,
    events: events.rows,
    totals: {
      packages: asInt(row.packages),
      packagesActive: asInt(row.packages_active),
      workspaces: asInt(row.workspaces),
      workspacesActive: asInt(row.workspaces_active),
      workspacesThisMonth: asInt(row.workspaces_this_month),
      workspacesLastMonth: asInt(row.workspaces_last_month),
      features: asInt(row.features),
      assignedFeatures: asInt(row.assigned_features),
      subscribersThisMonth: asInt(row.subscribers_this_month),
      subscribersLastMonth: asInt(row.subscribers_last_month),
    },
  };
}

export async function cancelAccountSubscription(accountId: string, createdBy: string) {
  const current = await currentSubscription(accountId);
  await q(
    undefined,
    `UPDATE saas_subscriptions SET status='canceled', canceled_at=NOW(), updated_at=NOW()
     WHERE account_id=$1 AND status IN ('trialing','active','pending_downgrade')`,
    [accountId]
  );
  await q(undefined, `UPDATE saas_accounts SET status='canceled', updated_at=NOW() WHERE id=$1`, [accountId]);
  await recordEvent({
    subscriptionId: current?.id,
    accountId,
    type: 'canceled',
    fromPackageId: current?.package_id,
    payload: { preserved: true },
    createdBy,
  });
}

export function navigationFor(role: PlatformRole, access: Access, catalog: CatalogFeature[] = []): NavItem[] {
  if (isSuperAdmin(role)) {
    const items: NavItem[] = [{ href: '/home', label: 'Dashboard', icon: 'HomeIcon' }];
    const seen = new Set(['/home']);
    const apps = access.features.length ? access.features : catalog;
    for (const feature of apps) {
      if (seen.has(feature.route)) continue;
      seen.add(feature.route);
      items.push(withYoutubeChildren({ href: feature.route, label: feature.sidebar_label || feature.name, icon: feature.icon || 'Squares2X2Icon', key: feature.feature_key }, role));
    }
    if (!apps.length) {
      items.push(
        withYoutubeChildren({ href: '/youtube', label: 'YouTube Research', icon: 'PlayCircleIcon', key: FEATURE_YOUTUBE }, role),
        { href: '/leads', label: 'Places', icon: 'MapPinIcon', key: FEATURE_LEADS },
      );
    }
    items.push(
      { href: '/subscriptions', label: 'Subscriptions', icon: 'CreditCardIcon' },
      { href: '/cms', label: 'CMS', icon: 'PencilSquareIcon' },
      { href: '/branding', label: 'Branding', icon: 'SwatchIcon' },
      { href: '/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
    );
    return items;
  }
  const items: NavItem[] = [{ href: '/home', label: 'Home', icon: 'HomeIcon' }];
  const seen = new Set(['/home']);
  for (const feature of access.features) {
    if (feature.feature_key === FEATURE_TEAM && role !== 'subscriber_admin' && role !== 'owner') continue;
    if (seen.has(feature.route)) continue;
    seen.add(feature.route);
    items.push(withYoutubeChildren({ href: feature.route, label: feature.sidebar_label, icon: feature.icon, key: feature.feature_key }, role));
  }
  const missing = catalog.filter((feature) => {
    if (access.has(feature.feature_key)) return false;
    if (feature.feature_key === FEATURE_TEAM && role !== 'subscriber_admin' && role !== 'owner') return false;
    return true;
  });
  for (const feature of missing) {
    if (seen.has(feature.route) || seen.has(feature.feature_key)) continue;
    seen.add(feature.feature_key);
    items.push(withYoutubeChildren({
      href: `/billing?need=${feature.feature_key}`,
      label: feature.sidebar_label || feature.name,
      icon: feature.icon || 'Squares2X2Icon',
      key: feature.feature_key,
      locked: true,
    }, role));
  }
  if (role === 'subscriber_admin' || role === 'owner') {
    items.push({ href: '/billing', label: 'Billing', icon: 'CreditCardIcon' });
  }
  items.push({ href: '/settings', label: 'Settings', icon: 'Cog6ToothIcon' });
  return items;
}
