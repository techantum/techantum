import { createAdminClient } from '@/lib/supabase/admin';
import { q } from '@/lib/finance/db';
import { FinanceValidationError } from '@/lib/finance/errors';
import { normalizeSubscriberRole, type SubscriberRole } from '@/lib/admin/roles';
import { type SaasAccount } from './session';
import { resolveAccess } from './catalog';

export type TeamMember = {
  user_id: string;
  email: string;
  name: string;
  role: SubscriberRole;
  created_at: string;
};

export async function listTeam(accountId: string) {
  const { rows } = await q<TeamMember>(
    undefined,
    `SELECT user_id, email, name, role, created_at::text
     FROM saas_memberships
     WHERE account_id=$1
     ORDER BY created_at ASC`,
    [accountId]
  );
  return rows.map((row) => ({ ...row, role: normalizeSubscriberRole(row.role) }));
}

export async function inviteTeamMember(
  account: SaasAccount,
  input: { email: string; name: string; password: string; role?: string }
) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split('@')[0];
  const role: SubscriberRole = input.role === 'subscriber_admin' ? 'subscriber_admin' : 'subscriber_user';
  if (!email.includes('@')) throw new FinanceValidationError('Enter a valid email address.');
  if (input.password.length < 8) throw new FinanceValidationError('Use a password of at least 8 characters.');
  const access = await resolveAccess(account, 'subscriber_admin');
  const members = await listTeam(account.id);
  if (access.seats > 0 && members.length >= access.seats) {
    throw new FinanceValidationError(`This plan includes ${access.seats} seat${access.seats === 1 ? '' : 's'}. Upgrade to add more people.`);
  }
  const existing = members.find((member) => member.email.toLowerCase() === email);
  if (existing) throw new FinanceValidationError('That email is already on this workspace.');
  const auth = createAdminClient();
  const created = await auth.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: name, app: 'revealeo', role },
  });
  let userId = created.data.user?.id || '';
  if (created.error || !userId) {
    const duplicate = /already|registered|exists/i.test(created.error?.message || '');
    if (!duplicate) throw new FinanceValidationError(created.error?.message || 'Could not create the user');
    const listed = await auth.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = listed.data.users.find((user) => user.email?.toLowerCase() === email)?.id || '';
    if (!userId) throw new FinanceValidationError('That email already has an account. Ask them to sign in.');
  }
  await q(
    undefined,
    `INSERT INTO saas_memberships (account_id, user_id, role, email, name) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (account_id, user_id) DO UPDATE SET role=$3, email=$4, name=$5`,
    [account.id, userId, role, email, name]
  );
  return { user_id: userId, email, name, role };
}

export async function updateTeamMember(accountId: string, userId: string, role: string, actorUserId: string) {
  const next = role === 'subscriber_admin' ? 'subscriber_admin' : 'subscriber_user';
  if (userId === actorUserId && next === 'subscriber_user') {
    const { rows } = await q<{ count: string }>(
      undefined,
      `SELECT COUNT(*)::text AS count FROM saas_memberships WHERE account_id=$1 AND role IN ('subscriber_admin','owner')`,
      [accountId]
    );
    if (Number(rows[0]?.count || 0) <= 1) throw new FinanceValidationError('Keep at least one Subscriber Admin on the workspace.');
  }
  await q(undefined, `UPDATE saas_memberships SET role=$3 WHERE account_id=$1 AND user_id=$2`, [accountId, userId, next]);
  return { user_id: userId, role: next };
}

export async function removeTeamMember(accountId: string, userId: string, actorUserId: string) {
  if (userId === actorUserId) throw new FinanceValidationError('You cannot remove yourself.');
  await q(undefined, `DELETE FROM saas_memberships WHERE account_id=$1 AND user_id=$2`, [accountId, userId]);
  return { ok: true };
}

export async function listSubscribers() {
  const { rows } = await q<SaasAccount & { seats_used: string; created_at?: string }>(
    undefined,
    `SELECT a.*, (SELECT COUNT(*)::text FROM saas_memberships m WHERE m.account_id = a.id) AS seats_used
     FROM saas_accounts a
     ORDER BY a.created_at DESC`
  );
  return rows;
}
