/**
 * Creates Super Admin + Admin Auth users and admin_users rows.
 * Usage: node --env-file=.env.local scripts/create-admin-users.mjs
 * Does not print passwords if they already exist.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const users = [
  { email: 'superadmin@techantum.com', password: 'Techantum@Super2026!', role: 'SUPER_ADMIN' },
  { email: 'admin@techantum.com', password: 'Techantum@Admin2026!', role: 'ADMIN' },
];

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

for (const user of users) {
  const { data: existing } = await supabase.from('admin_users').select('user_id,email,role').eq('email', user.email).maybeSingle();
    if (existing?.user_id) {
      const { error } = await supabase.from('admin_users').update({ role: user.role }).eq('user_id', existing.user_id);
      if (error) console.error(user.email, error.message);
      else console.log(`Updated role for ${user.email} → ${user.role}`);
      await supabase.auth.admin.updateUserById(existing.user_id, { password: user.password, email_confirm: true });
      continue;
    }

  const created = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });
  if (created.error) {
    if (/already/i.test(created.error.message)) {
      const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list.data.users.find((row) => row.email === user.email);
      if (found) {
        await supabase.from('admin_users').upsert({ user_id: found.id, email: user.email, role: user.role });
        console.log(`Linked existing auth user ${user.email} → ${user.role}`);
      } else {
        console.error(user.email, created.error.message);
      }
      continue;
    }
    console.error(user.email, created.error.message);
    continue;
  }
  const { error } = await supabase.from('admin_users').upsert({
    user_id: created.data.user.id,
    email: user.email,
    role: user.role,
  });
  if (error) console.error(user.email, error.message);
  else console.log(`Created ${user.email} as ${user.role}`);
}
