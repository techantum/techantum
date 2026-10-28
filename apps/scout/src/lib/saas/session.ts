import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isSuperAdmin, normalizeSubscriberRole, type PlatformRole } from '@/lib/admin/roles';
import { publicAppUrl } from '@/lib/brand';
import { q } from '@/lib/finance/db';
import { createClient } from '@supabase/supabase-js';
import { createAuthAdminClient, getPublishableKey } from '@/lib/supabase/admin';
import { getPackageById, trialPackage } from './catalog';
import { emailError, isPersonName, isStrongPassword } from '@/lib/forms/rules';

export const SAAS_COOKIE = 'revealeo_session';
const LEGACY_COOKIE = 'saas_session';

export type SaasAccount = {
  id: string;
  owner_user_id: string;
  name: string;
  email: string;
  plan: string;
  package_id?: string | null;
  contracted_price_monthly?: number | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  razorpay_subscription_id?: string | null;
  pending_package_id?: string | null;
};

export type SaasActor = {
  userId: string;
  email: string;
  name: string;
  role: 'subscriber_admin' | 'subscriber_user';
  account: SaasAccount;
};

export type PlatformActor = {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: PlatformRole;
  account: SaasAccount | null;
};

function secret() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SAAS_SESSION_SECRET || 'saas-dev-secret';
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function encodeSaasCookie(userId: string) {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const body = `${userId}.${exp}`;
  return `${body}.${sign(body)}`;
}

export function decodeSaasCookie(value: string | undefined | null) {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, mac] = parts;
  const body = `${userId}.${exp}`;
  const expected = sign(body);
  try {
    if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  if (Number(exp) < Date.now()) return null;
  return userId;
}

function cookieSecure() {
  const url = publicAppUrl();
  if (/localhost|127\.0\.0\.1/i.test(url)) return false;
  return url.startsWith('https://');
}

export async function setSaasCookie(response: NextResponse, userId: string) {
  const cookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecure(),
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  };
  response.cookies.set(SAAS_COOKIE, encodeSaasCookie(userId), cookie);
  response.cookies.set(LEGACY_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}

export function clearSaasCookie(response: NextResponse) {
  response.cookies.set(SAAS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set(LEGACY_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}

export async function readSaasUserId() {
  try {
    const jar = await cookies();
    return decodeSaasCookie(jar.get(SAAS_COOKIE)?.value) || decodeSaasCookie(jar.get(LEGACY_COOKIE)?.value);
  } catch {
    return null;
  }
}

async function lookupAdmin(userId: string) {
  try {
    const { rows } = await q<{ user_id: string; email: string; role: string }>(
      undefined,
      `SELECT user_id, email, role FROM admin_users WHERE user_id=$1 LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function getPlatformActor(): Promise<PlatformActor | null> {
  const userId = await readSaasUserId();
  if (!userId) return null;
  const admin = await lookupAdmin(userId);
  const profile = await q<{ name: string | null; avatar_url: string | null }>(
    undefined,
    `SELECT name, avatar_url FROM saas_profiles WHERE user_id=$1 LIMIT 1`,
    [userId]
  ).catch(() => ({ rows: [] as { name: string | null; avatar_url: string | null }[] }));
  const stored = profile.rows[0];
  if (admin && isSuperAdmin(admin.role)) {
    return {
      userId,
      email: admin.email,
      name: stored?.name?.trim() || admin.email.split('@')[0],
      avatarUrl: stored?.avatar_url || null,
      role: 'SUPER_ADMIN',
      account: null,
    };
  }
  const subscriber = await getSaasActor();
  if (!subscriber) return null;
  return {
    ...subscriber,
    name: stored?.name?.trim() || subscriber.name,
    avatarUrl: stored?.avatar_url || null,
  };
}

export async function getSaasActor(): Promise<SaasActor | null> {
  const userId = await readSaasUserId();
  if (!userId) return null;
  const { rows } = await q<SaasAccount & { member_role?: string; member_email?: string; member_name?: string }>(
    undefined,
    `SELECT a.id, a.owner_user_id, a.name, a.email, a.plan, a.package_id, a.contracted_price_monthly, a.status, a.trial_ends_at, a.current_period_end,
            a.razorpay_subscription_id, a.pending_package_id,
            m.role AS member_role, m.email AS member_email, m.name AS member_name
     FROM saas_accounts a
     JOIN saas_memberships m ON m.account_id = a.id
     WHERE m.user_id=$1
     LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    userId,
    email: row.member_email || row.email,
    name: row.member_name || row.name,
    role: normalizeSubscriberRole(row.member_role),
    account: {
      id: row.id,
      owner_user_id: row.owner_user_id,
      name: row.name,
      email: row.email,
      plan: row.plan,
      package_id: row.package_id,
      contracted_price_monthly: row.contracted_price_monthly == null ? null : Number(row.contracted_price_monthly),
      status: row.status,
      trial_ends_at: row.trial_ends_at,
      current_period_end: row.current_period_end,
      razorpay_subscription_id: row.razorpay_subscription_id,
      pending_package_id: row.pending_package_id,
    },
  };
}

export function accountIsActive(account: SaasAccount) {
  if (account.status === 'canceled' || account.status === 'pending_autopay') return false;
  if (account.status === 'trialing' && account.trial_ends_at && new Date(account.trial_ends_at).getTime() < Date.now()) return false;
  if (account.status === 'past_due') return false;
  return true;
}

export function trialPath(packageId?: string | null) {
  return packageId ? `/trial?package=${encodeURIComponent(packageId)}` : '/trial';
}

export function websitePath() {
  return '/?buy=1';
}

export function afterAuthPath(packageId?: string | null, account?: SaasAccount | null) {
  if (packageId) return trialPath(packageId);
  if (!account) return '/home';
  return websitePath();
}

export async function requirePlatformActor() {
  const actor = await getPlatformActor();
  if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (actor.account && !accountIsActive(actor.account) && !isSuperAdmin(actor.role)) {
    return { error: NextResponse.json({ error: 'Your subscription is not active. Open Billing to continue.' }, { status: 402 }) };
  }
  return actor;
}

export async function requireSaasActor() {
  const actor = await getSaasActor();
  if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!accountIsActive(actor.account)) {
    return { error: NextResponse.json({ error: 'Your subscription is not active. Open Billing to continue.' }, { status: 402 }) };
  }
  return actor;
}

async function provisionWorkspace(userId: string, email: string, name: string, pendingPackageId?: string | null) {
  const existing = await q<SaasAccount>(
    undefined,
    `SELECT a.* FROM saas_accounts a JOIN saas_memberships m ON m.account_id = a.id WHERE m.user_id=$1 LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) {
    if (pendingPackageId && existing.rows[0].status === 'pending_autopay') {
      await q(undefined, `UPDATE saas_accounts SET pending_package_id=$2, updated_at=NOW() WHERE id=$1`, [existing.rows[0].id, pendingPackageId]);
      existing.rows[0].pending_package_id = pendingPackageId;
    }
    return { userId, account: existing.rows[0] };
  }
  const chosen = pendingPackageId ? await getPackageById(pendingPackageId) : await trialPackage();
  const account = await q<SaasAccount>(
    undefined,
    `INSERT INTO saas_accounts (owner_user_id, name, email, plan, package_id, contracted_price_monthly, status, trial_ends_at, current_period_end, pending_package_id)
     VALUES ($1,$2,$3,$4,$5,$6,'pending_autopay',NULL,NULL,$7) RETURNING *`,
    [userId, name, email, chosen?.slug || 'growth', chosen?.id || null, chosen?.price_monthly || 0, chosen?.id || pendingPackageId || null]
  );
  await q(
    undefined,
    `INSERT INTO saas_memberships (account_id, user_id, role, email, name) VALUES ($1,$2,'subscriber_admin',$3,$4)
     ON CONFLICT (account_id, user_id) DO NOTHING`,
    [account.rows[0].id, userId, email, name]
  );
  return { userId, account: account.rows[0] };
}

async function passwordSignIn(email: string, password: string) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = getPublishableKey();
  if (!url || !key) throw new Error('Sign in is not configured. Set SUPABASE_URL and the anon key.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message || 'Invalid email or password');
  return data.user;
}

export async function createSaasAccount(input: { email: string; password: string; name: string; packageId?: string | null }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split('@')[0];
  if (emailError(email)) throw new Error(emailError(email));
  if (name && !isPersonName(name)) throw new Error('Enter a workspace name using letters only.');
  if (!isStrongPassword(input.password)) throw new Error('Use a password of at least 8 characters, with uppercase, lowercase, a number, and a symbol.');
  const auth = createAuthAdminClient();
  const created = await auth.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: name, app: 'revealeo' },
  });
  let userId = created.data.user?.id || '';
  if (created.error || !userId) {
    const duplicate = /already|registered|exists/i.test(created.error?.message || '');
    if (!duplicate) throw new Error(created.error?.message || 'Could not create the account');
    const existing = await passwordSignIn(email, input.password);
    userId = existing.id;
  }
  const admin = await lookupAdmin(userId);
  if (admin && isSuperAdmin(admin.role)) throw new Error('Super Admin accounts sign in from the login page. They are not subscriber workspaces.');
  return provisionWorkspace(userId, email, name, input.packageId);
}

export async function loginSaasAccount(email: string, password: string, packageId?: string | null) {
  const user = await passwordSignIn(email.trim().toLowerCase(), password);
  const admin = await lookupAdmin(user.id);
  if (admin && isSuperAdmin(admin.role)) return { userId: user.id, account: null as SaasAccount | null };
  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]);
  const provisioned = await provisionWorkspace(user.id, user.email || email.trim().toLowerCase(), name, packageId);
  return { userId: user.id, account: provisioned.account };
}

export async function completeOAuthLogin(input: { userId: string; email: string; name: string; packageId?: string | null }) {
  const admin = await lookupAdmin(input.userId);
  if (admin && isSuperAdmin(admin.role)) return { userId: input.userId, account: null as SaasAccount | null };
  const provisioned = await provisionWorkspace(input.userId, input.email, input.name || input.email.split('@')[0], input.packageId);
  return { userId: input.userId, account: provisioned.account };
}

export async function setSaasPlan(accountId: string, plan: string) {
  const period = new Date(Date.now() + 30 * 86400000).toISOString();
  await q(
    undefined,
    `UPDATE saas_accounts SET plan=$2, status='active', current_period_end=$3, trial_ends_at=NULL WHERE id=$1`,
    [accountId, plan, period]
  );
}
