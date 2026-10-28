import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadAppEnv } from './load-env.mjs';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadAppEnv(appDir);

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || !key || !dbUrl) {
  console.error('Missing SUPABASE_URL / service role key / DATABASE_URL');
  process.exit(1);
}

const USERS = [
  { email: 'superadmin@techantum.com', password: 'Techantum@Super2026!', role: 'SUPER_ADMIN', name: 'Super Admin' },
  { email: 'subscriber-admin@revealeo.com', password: 'Revealeo@Admin2026!', role: 'subscriber_admin', name: 'Subscriber Admin' },
  { email: 'subscriber-user@revealeo.com', password: 'Revealeo@User2026!', role: 'subscriber_user', name: 'Subscriber User' },
];

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const db = new pg.Client({
  connectionString: dbUrl,
  ssl: /supabase\.com/i.test(dbUrl) ? { rejectUnauthorized: false } : undefined,
});
await db.connect();

async function findAuthUserId(email) {
  const link = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.data.user?.id) return link.data.user.id;
  for (let page = 1; page <= 10; page += 1) {
    const list = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    const found = list.data.users.find((row) => row.email?.toLowerCase() === email);
    if (found) return found.id;
    if (!list.data.users.length) break;
  }
  return '';
}

async function ensureAuthUser(email, password, name, role) {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, app: 'revealeo', role },
  });
  let userId = created.data.user?.id || '';
  if (!userId) userId = await findAuthUserId(email);
  if (!userId) throw new Error(created.error?.message || `Could not create ${email}`);
  await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true, user_metadata: { full_name: name, app: 'revealeo', role } });
  return userId;
}

const ids = {};
for (const user of USERS) {
  ids[user.role] = await ensureAuthUser(user.email, user.password, user.name, user.role);
  console.log(`Auth ready: ${user.email}`);
}

await db.query(
  `INSERT INTO public.admin_users (user_id, email, role) VALUES ($1, $2, 'SUPER_ADMIN')
   ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, role = 'SUPER_ADMIN'`,
  [ids.SUPER_ADMIN, 'superadmin@techantum.com']
);

const trialEnds = new Date(Date.now() + 14 * 86400000).toISOString();
const account = await db.query(
  `SELECT id FROM public.saas_accounts WHERE email = $1 LIMIT 1`,
  ['subscriber-admin@revealeo.com']
);
let accountId = account.rows[0]?.id;
if (!accountId) {
  const inserted = await db.query(
    `INSERT INTO public.saas_accounts (owner_user_id, name, email, plan, status, trial_ends_at)
     VALUES ($1, $2, $3, 'growth', 'trialing', $4)
     RETURNING id`,
    [ids.subscriber_admin, 'Hookooh Demo', 'subscriber-admin@revealeo.com', trialEnds]
  );
  accountId = inserted.rows[0].id;
}

for (const user of USERS.filter((item) => item.role !== 'SUPER_ADMIN')) {
  await db.query(
    `INSERT INTO public.saas_memberships (account_id, user_id, role, email, name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (account_id, user_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, name = EXCLUDED.name`,
    [accountId, ids[user.role], user.role, user.email, user.name]
  );
}

await db.end();
console.log('Seeded Super Admin, Subscriber Admin, and Subscriber User.');
