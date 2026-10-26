import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { q } from '@/lib/finance/db';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient, getPublishableKey } from '@/lib/supabase/admin';
import { saasPlan, TRIAL_DAYS, TRIAL_PLAN, type SaasPlanId } from './plans';

export const SAAS_COOKIE = 'saas_session';

export type SaasAccount = {
  id: string;
  owner_user_id: string;
  name: string;
  email: string;
  plan: SaasPlanId;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export type SaasActor = {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  account: SaasAccount;
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

export async function setSaasCookie(response: NextResponse, userId: string) {
  response.cookies.set(SAAS_COOKIE, encodeSaasCookie(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}

export function clearSaasCookie(response: NextResponse) {
  response.cookies.set(SAAS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}

export async function readSaasUserId() {
  try {
    const jar = await cookies();
    return decodeSaasCookie(jar.get(SAAS_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function getSaasActor(): Promise<SaasActor | null> {
  const userId = await readSaasUserId();
  if (!userId) return null;
  const { rows } = await q<SaasAccount & { member_role?: string; member_email?: string; member_name?: string }>(
    undefined,
    `SELECT a.id, a.owner_user_id, a.name, a.email, a.plan, a.status, a.trial_ends_at, a.current_period_end,
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
    role: row.member_role === 'member' ? 'member' : 'owner',
    account: {
      id: row.id,
      owner_user_id: row.owner_user_id,
      name: row.name,
      email: row.email,
      plan: row.plan,
      status: row.status,
      trial_ends_at: row.trial_ends_at,
      current_period_end: row.current_period_end,
    },
  };
}

export function accountIsActive(account: SaasAccount) {
  if (account.status === 'canceled') return false;
  if (account.status === 'trialing' && account.trial_ends_at && new Date(account.trial_ends_at).getTime() < Date.now()) return false;
  if (account.status === 'past_due') return false;
  return true;
}

export function entitlementsFor(account: SaasAccount) {
  const active = accountIsActive(account);
  const plan = saasPlan(account.status === 'trialing' && active ? TRIAL_PLAN : account.plan);
  return {
    active,
    plan,
    youtube: active && plan.youtube,
    leads: active && plan.leads,
    projects: plan.projects,
    leadsPerMonth: plan.leadsPerMonth,
    seats: plan.seats,
  };
}

export async function requireSaasActor() {
  const actor = await getSaasActor();
  if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!accountIsActive(actor.account)) {
    return { error: NextResponse.json({ error: 'Your subscription is not active. Open Billing to continue.' }, { status: 402 }) };
  }
  return actor;
}

export async function createSaasAccount(input: { email: string; password: string; name: string }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split('@')[0];
  if (!email || input.password.length < 8) throw new Error('Use a valid email and a password of at least 8 characters.');
  const auth = createAdminClient();
  const created = await auth.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: name, app: 'saas' },
  });
  if (created.error || !created.data.user) throw new Error(created.error?.message || 'Could not create the account');
  const userId = created.data.user.id;
  const trialEnds = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
  const account = await q<SaasAccount>(
    undefined,
    `INSERT INTO saas_accounts (owner_user_id, name, email, plan, status, trial_ends_at)
     VALUES ($1,$2,$3,$4,'trialing',$5) RETURNING *`,
    [userId, name, email, TRIAL_PLAN, trialEnds]
  );
  await q(
    undefined,
    `INSERT INTO saas_memberships (account_id, user_id, role, email, name) VALUES ($1,$2,'owner',$3,$4)`,
    [account.rows[0].id, userId, email, name]
  );
  return { userId, account: account.rows[0] };
}

export async function loginSaasAccount(email: string, password: string) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const client = createClient(url, getPublishableKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) throw new Error(error?.message || 'Invalid email or password');
  const { rows } = await q(undefined, `SELECT user_id FROM saas_memberships WHERE user_id=$1 LIMIT 1`, [data.user.id]);
  if (!rows[0]) throw new Error('This login is not a Scout account. Sign up on this app first.');
  return data.user.id;
}

export async function setSaasPlan(accountId: string, plan: SaasPlanId) {
  const period = new Date(Date.now() + 30 * 86400000).toISOString();
  await q(
    undefined,
    `UPDATE saas_accounts SET plan=$2, status='active', current_period_end=$3, trial_ends_at=NULL WHERE id=$1`,
    [accountId, plan, period]
  );
}
