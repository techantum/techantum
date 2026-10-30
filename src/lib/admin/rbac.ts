import { getPool, query } from '@/lib/db/postgres';
import { generateInviteToken, hashInviteToken } from '@/lib/partner/invite-token';
import { publicSiteOrigin } from '@/lib/auth/public-origin';
import {
  inheritAccess,
  maxAccess,
  mergeAccessMaps,
  type AccessLevel,
  type FeatureNode,
} from './access';
import { permissionCatalog, permissionTree } from './permission-registry';

export const ADMIN_INVITE_HOURS = Number(process.env.ADMIN_INVITE_HOURS || 72);

export type AdminUserStatus = 'invited' | 'active' | 'inactive' | 'suspended';

export type ResolvedAuthorization = {
  rbacManaged: boolean;
  isSuperAdmin: boolean;
  status: AdminUserStatus;
  roleCodes: string[];
  roleNames: string[];
  access: Record<string, AccessLevel>;
};

const IMPLICIT: Record<string, AccessLevel> = { dashboard: 'READ', profile: 'FULL' };

function isMissingRelation(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  return code === '42P01' || /does not exist/i.test(error instanceof Error ? error.message : String(error));
}

export function roleCodeFromName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

export async function ensurePermissionRegistry() {
  const catalog = permissionCatalog();
  if (!catalog.length) return;
  const values: string[] = [];
  const params: unknown[] = [];
  catalog.forEach((row, index) => {
    const base = index * 6;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
    params.push(row.permission_key, row.module, row.feature, row.feature_key, row.action, row.display_name);
  });
  await query(
    `INSERT INTO public.admin_permissions
       (permission_key, module, feature, feature_key, action, display_name)
     VALUES ${values.join(', ')}
     ON CONFLICT (permission_key) DO UPDATE SET
       module = EXCLUDED.module,
       feature = EXCLUDED.feature,
       feature_key = EXCLUDED.feature_key,
       display_name = EXCLUDED.display_name,
       active = TRUE`,
    params
  );
  await seedTemplateAccess();
}

async function seedTemplateAccess() {
  const templates: Record<string, Record<string, AccessLevel>> = {
    PROJECT_MANAGER: { 'project-management': 'FULL' },
    HR_ADMIN: { hr: 'FULL' },
    FINANCE_ADMIN: { finance: 'FULL' },
    VIEWER: { dashboard: 'READ' },
  };
  for (const [code, access] of Object.entries(templates)) {
    const { rows } = await query<{ id: string }>(`SELECT id FROM public.admin_roles WHERE code = $1`, [code]);
    const roleId = rows[0]?.id;
    if (!roleId) continue;
    const existing = await query(`SELECT 1 FROM public.admin_role_permissions WHERE role_id = $1 LIMIT 1`, [roleId]);
    if (existing.rows.length) continue;
    for (const [featureKey, level] of Object.entries(access)) {
      await query(
        `INSERT INTO public.admin_role_permissions (role_id, feature_key, access_level)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [roleId, featureKey, level]
      );
    }
  }
}

export async function loadAuthorization(userId: string): Promise<ResolvedAuthorization> {
  try {
    const { rows: userRows } = await query<{ role: string; status: AdminUserStatus }>(
      `SELECT role, COALESCE(status, 'active') AS status FROM public.admin_users WHERE user_id = $1`,
      [userId]
    );
    const user = userRows[0];
    if (!user) {
      return { rbacManaged: false, isSuperAdmin: false, status: 'inactive', roleCodes: [], roleNames: [], access: {} };
    }

    const { rows: roleRows } = await query<{
      code: string;
      name: string;
      is_system: boolean;
      status: string;
    }>(
      `SELECT r.code, r.name, r.is_system, r.status
       FROM public.admin_user_roles ur
       JOIN public.admin_roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND ur.active = TRUE`,
      [userId]
    );

    const rbacManaged = roleRows.length > 0;
    const isSuperAdmin =
      user.role === 'SUPER_ADMIN' || roleRows.some((row) => row.code === 'SUPER_ADMIN' && row.status === 'active');

    if (isSuperAdmin) {
      return {
        rbacManaged,
        isSuperAdmin: true,
        status: user.status,
        roleCodes: roleRows.map((row) => row.code),
        roleNames: roleRows.map((row) => row.name),
        access: {},
      };
    }

    if (!rbacManaged) {
      return {
        rbacManaged: false,
        isSuperAdmin: false,
        status: user.status,
        roleCodes: [user.role],
        roleNames: [user.role],
        access: {},
      };
    }

    const { rows: permRows } = await query<{ feature_key: string; access_level: AccessLevel }>(
      `SELECT rp.feature_key, rp.access_level
       FROM public.admin_user_roles ur
       JOIN public.admin_roles r ON r.id = ur.role_id AND r.status = 'active'
       JOIN public.admin_role_permissions rp ON rp.role_id = r.id
       WHERE ur.user_id = $1 AND ur.active = TRUE`,
      [userId]
    );

    const byRole: Record<string, AccessLevel>[] = [];
    const grouped = new Map<string, Record<string, AccessLevel>>();
    for (const row of permRows) {
      const bucket = grouped.get(row.feature_key) || {};
      bucket[row.feature_key] = maxAccess(bucket[row.feature_key], row.access_level);
      grouped.set(row.feature_key, bucket);
    }
    const assigned: Record<string, AccessLevel> = {};
    for (const row of permRows) assigned[row.feature_key] = maxAccess(assigned[row.feature_key], row.access_level);
    byRole.push(assigned);
    const merged = mergeAccessMaps(byRole);
    const access = { ...IMPLICIT, ...inheritAccess(permissionTree(), merged) };

    return {
      rbacManaged: true,
      isSuperAdmin: false,
      status: user.status,
      roleCodes: roleRows.map((row) => row.code),
      roleNames: roleRows.map((row) => row.name),
      access,
    };
  } catch (error) {
    if (isMissingRelation(error)) {
      return { rbacManaged: false, isSuperAdmin: false, status: 'active', roleCodes: [], roleNames: [], access: {} };
    }
    throw error;
  }
}

export function can(
  auth: { isSuperAdmin?: boolean; rbacManaged?: boolean; access?: Record<string, AccessLevel> },
  featureKey: string,
  needed: AccessLevel = 'READ'
) {
  if (auth.isSuperAdmin) return true;
  if (!auth.rbacManaged) return false;
  const have = auth.access?.[featureKey] || 'NONE';
  const rank = { NONE: 0, READ: 1, FULL: 2 };
  return rank[have] >= rank[needed];
}

export async function writeAudit(input: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetUserId?: string | null;
  targetRoleId?: string | null;
  targetEmail?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await query(
      `INSERT INTO public.admin_audit_logs
         (actor_user_id, actor_email, action, target_user_id, target_role_id, target_email, previous_value, new_value, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)`,
      [
        input.actorUserId || null,
        input.actorEmail || null,
        input.action,
        input.targetUserId || null,
        input.targetRoleId || null,
        input.targetEmail || null,
        input.previousValue ? JSON.stringify(input.previousValue) : null,
        input.newValue ? JSON.stringify(input.newValue) : null,
        input.ip || null,
        input.userAgent || null,
      ]
    );
  } catch (error) {
    if (!isMissingRelation(error)) console.error('[admin audit]', error);
  }
}

export async function listRoles() {
  await ensurePermissionRegistry();
  const { rows } = await query<{
    id: string;
    name: string;
    code: string;
    description: string | null;
    is_system: boolean;
    status: string;
    created_by: string | null;
    created_at: string;
    user_count: number;
    module_count: number;
    created_by_email: string | null;
  }>(
    `SELECT r.id, r.name, r.code, r.description, r.is_system, r.status, r.created_by, r.created_at,
            (SELECT COUNT(*)::int FROM public.admin_user_roles ur WHERE ur.role_id = r.id AND ur.active) AS user_count,
            (SELECT COUNT(DISTINCT split_part(feature_key, '.', 1))::int
               FROM public.admin_role_permissions rp
              WHERE rp.role_id = r.id AND rp.access_level <> 'NONE') AS module_count,
            u.email AS created_by_email
       FROM public.admin_roles r
       LEFT JOIN public.admin_users u ON u.user_id = r.created_by
       ORDER BY r.is_system DESC, r.name`
  );
  return rows;
}

export async function getRole(id: string) {
  const { rows } = await query(
    `SELECT r.*, u.email AS created_by_email
       FROM public.admin_roles r
       LEFT JOIN public.admin_users u ON u.user_id = r.created_by
      WHERE r.id = $1`,
    [id]
  );
  const role = rows[0];
  if (!role) return null;
  const perms = await query<{ feature_key: string; access_level: AccessLevel }>(
    `SELECT feature_key, access_level FROM public.admin_role_permissions WHERE role_id = $1`,
    [id]
  );
  const users = await query<{ user_id: string; email: string; first_name: string | null; last_name: string | null }>(
    `SELECT a.user_id, a.email, a.first_name, a.last_name
       FROM public.admin_user_roles ur
       JOIN public.admin_users a ON a.user_id = ur.user_id
      WHERE ur.role_id = $1 AND ur.active
      ORDER BY a.email`,
    [id]
  );
  return { ...role, permissions: Object.fromEntries(perms.rows.map((row) => [row.feature_key, row.access_level])), users: users.rows };
}

export async function createRole(input: {
  name: string;
  description?: string;
  status?: string;
  permissions?: Record<string, AccessLevel>;
  createdBy: string;
}) {
  const name = input.name.trim();
  if (!name) throw Object.assign(new Error('Role name is required.'), { status: 400 });
  const code = roleCodeFromName(name);
  let rows: { id: string }[];
  try {
    ({ rows } = await query<{ id: string }>(
      `INSERT INTO public.admin_roles (name, code, description, is_system, status, created_by, updated_by)
       VALUES ($1, $2, $3, FALSE, $4, $5, $5)
       RETURNING id`,
      [name, code, input.description?.trim() || null, input.status === 'inactive' ? 'inactive' : 'active', input.createdBy]
    ));
  } catch (error) {
    const codeErr = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
    if (codeErr === '23505') throw Object.assign(new Error('Role name must be unique.'), { status: 409 });
    throw error;
  }
  const id = rows[0].id;
  await saveRolePermissions(id, input.permissions || {});
  return getRole(id);
}

export async function updateRole(
  id: string,
  input: { name?: string; description?: string; status?: string; permissions?: Record<string, AccessLevel>; updatedBy: string }
) {
  const current = await getRole(id);
  if (!current) throw Object.assign(new Error('Role not found.'), { status: 404 });
  if (current.is_system && (input.status === 'inactive' || (input.permissions && Object.keys(input.permissions).length))) {
    throw Object.assign(new Error('The Super Admin role cannot be restricted or disabled.'), { status: 400 });
  }
  if (input.name && input.name.trim() !== current.name && current.is_system) {
    throw Object.assign(new Error('System role names cannot be changed.'), { status: 400 });
  }
  await query(
    `UPDATE public.admin_roles
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            status = COALESCE($4, status),
            updated_by = $5,
            updated_at = NOW()
      WHERE id = $1`,
    [id, input.name?.trim() || null, input.description ?? null, input.status || null, input.updatedBy]
  );
  if (input.permissions) await saveRolePermissions(id, input.permissions);
  return getRole(id);
}

export async function duplicateRole(id: string, name: string, createdBy: string) {
  const source = await getRole(id);
  if (!source) throw Object.assign(new Error('Role not found.'), { status: 404 });
  return createRole({
    name,
    description: source.description || `Copy of ${source.name}`,
    status: 'active',
    permissions: source.permissions,
    createdBy,
  });
}

async function saveRolePermissions(roleId: string, permissions: Record<string, AccessLevel>) {
  await query(`DELETE FROM public.admin_role_permissions WHERE role_id = $1`, [roleId]);
  const entries = Object.entries(permissions).filter(([, level]) => level && level !== 'NONE');
  for (const [featureKey, level] of entries) {
    await query(
      `INSERT INTO public.admin_role_permissions (role_id, feature_key, access_level) VALUES ($1, $2, $3)`,
      [roleId, featureKey, level]
    );
  }
}

export async function countActiveSuperAdmins(excludeUserId?: string) {
  const { rows } = await query<{ count: number }>(
    `SELECT COUNT(DISTINCT a.user_id)::int AS count
       FROM public.admin_users a
       LEFT JOIN public.admin_user_roles ur ON ur.user_id = a.user_id AND ur.active
       LEFT JOIN public.admin_roles r ON r.id = ur.role_id AND r.code = 'SUPER_ADMIN' AND r.status = 'active'
      WHERE a.status = 'active'
        AND ($1::uuid IS NULL OR a.user_id <> $1)
        AND (a.role = 'SUPER_ADMIN' OR r.id IS NOT NULL)`,
    [excludeUserId || null]
  );
  return Number(rows[0]?.count || 0);
}

export async function listAdminUsers() {
  const { rows } = await query(
    `SELECT a.user_id, a.email, a.first_name, a.last_name, a.phone, a.status, a.notes, a.role,
            a.last_login_at, a.created_at, a.created_by,
            creator.email AS created_by_email,
            (
              SELECT i.status FROM public.admin_invitations i
               WHERE i.user_id = a.user_id
               ORDER BY i.invited_at DESC LIMIT 1
            ) AS invitation_status,
            COALESCE((
              SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'code', r.code))
                FROM public.admin_user_roles ur
                JOIN public.admin_roles r ON r.id = ur.role_id
               WHERE ur.user_id = a.user_id AND ur.active
            ), '[]'::json) AS roles
       FROM public.admin_users a
       LEFT JOIN public.admin_users creator ON creator.user_id = a.created_by
       ORDER BY a.created_at DESC`
  );
  return rows;
}

export async function getAdminUser(userId: string) {
  const { rows } = await query(`SELECT * FROM public.admin_users WHERE user_id = $1`, [userId]);
  const user = rows[0];
  if (!user) return null;
  const roles = await query(
    `SELECT r.id, r.name, r.code, ur.assigned_at
       FROM public.admin_user_roles ur
       JOIN public.admin_roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND ur.active`,
    [userId]
  );
  const invites = await query(
    `SELECT id, email, status, invited_at, expires_at, accepted_at, revoked_at
       FROM public.admin_invitations WHERE user_id = $1 ORDER BY invited_at DESC LIMIT 20`,
    [userId]
  );
  const audit = await query(
    `SELECT action, actor_email, created_at, ip FROM public.admin_audit_logs
      WHERE target_user_id = $1 OR actor_user_id = $1
      ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );
  const authorization = await loadAuthorization(userId);
  return { ...user, roles: roles.rows, invitations: invites.rows, activity: audit.rows, authorization };
}

export async function listAuditLogs(limit = 200) {
  const { rows } = await query(
    `SELECT * FROM public.admin_audit_logs ORDER BY created_at DESC LIMIT $1`,
    [Math.min(limit, 500)]
  );
  return rows;
}

export async function searchEmployees(q: string) {
  try {
    const { rows } = await query(
      `SELECT id, full_name, email, designation, department, user_id, status
         FROM public.finance_employees
        WHERE status = 'active'
          AND ($1 = '' OR full_name ILIKE $2 OR email ILIKE $2)
        ORDER BY full_name
        LIMIT 40`,
      [q.trim(), `%${q.trim()}%`]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function assignRoles(userId: string, roleIds: string[], assignedBy: string) {
  const unique = [...new Set(roleIds.filter(Boolean))];
  if (!unique.length) throw Object.assign(new Error('Assign at least one role.'), { status: 400 });
  const current = await query<{ role_id: string }>(
    `SELECT role_id FROM public.admin_user_roles WHERE user_id = $1 AND active`,
    [userId]
  );
  await query(`UPDATE public.admin_user_roles SET active = FALSE WHERE user_id = $1`, [userId]);
  for (const roleId of unique) {
    await query(
      `INSERT INTO public.admin_user_roles (user_id, role_id, assigned_by, active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (user_id, role_id) DO UPDATE SET active = TRUE, assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()`,
      [userId, roleId, assignedBy]
    );
  }
  const { rows: codes } = await query<{ code: string }>(
    `SELECT r.code FROM public.admin_roles r WHERE r.id = ANY($1::uuid[])`,
    [unique]
  );
  const nextRole = codes.rows.some((row) => row.code === 'SUPER_ADMIN') ? 'SUPER_ADMIN' : 'ADMIN';
  await query(`UPDATE public.admin_users SET role = $2, updated_at = NOW() WHERE user_id = $1`, [userId, nextRole]);
  return { previous: current.rows.map((row) => row.role_id), next: unique, portalRole: nextRole };
}

export async function setAdminStatus(userId: string, status: AdminUserStatus, actorId: string) {
  const target = await query<{ role: string; status: string; email: string }>(
    `SELECT role, status, email FROM public.admin_users WHERE user_id = $1`,
    [userId]
  );
  if (!target.rows[0]) throw Object.assign(new Error('Admin user not found.'), { status: 404 });
  if (status !== 'active' && (await isProtectedSuperAdmin(userId))) {
    throw Object.assign(new Error('The last active Super Admin cannot be disabled.'), { status: 400 });
  }
  await query(`UPDATE public.admin_users SET status = $2, updated_at = NOW() WHERE user_id = $1`, [userId, status]);
  if (status !== 'active') {
    const client = await getPool().connect();
    try {
      await client.query(`DELETE FROM auth.refresh_tokens WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM auth.sessions WHERE user_id = $1`, [userId]);
    } finally {
      client.release();
    }
  }
  return target.rows[0];
}

async function isProtectedSuperAdmin(userId: string) {
  const authz = await loadAuthorization(userId);
  if (!authz.isSuperAdmin) return false;
  return (await countActiveSuperAdmins(userId)) < 1;
}

export function inviteExpiryDate(now = Date.now()) {
  return new Date(now + ADMIN_INVITE_HOURS * 60 * 60 * 1000);
}

export function classifyAdminInvite(
  invite: { status: string; expires_at: string; accepted_at?: string | null } | null,
  now = new Date()
): 'valid' | 'expired' | 'used' | 'revoked' | 'invalid' {
  if (!invite) return 'invalid';
  if (invite.status === 'accepted' || invite.accepted_at) return 'used';
  if (invite.status === 'revoked') return 'revoked';
  if (invite.status === 'expired' || new Date(invite.expires_at).getTime() <= now.getTime()) return 'expired';
  if (invite.status === 'pending') return 'valid';
  return 'invalid';
}

export async function createInvitation(userId: string, email: string, invitedBy: string) {
  await query(
    `UPDATE public.admin_invitations
        SET status = 'revoked', revoked_at = NOW()
      WHERE user_id = $1 AND status = 'pending'`,
    [userId]
  );
  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = inviteExpiryDate();
  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.admin_invitations (user_id, email, token_hash, status, invited_by, expires_at)
     VALUES ($1, $2, $3, 'pending', $4, $5)
     RETURNING id`,
    [userId, email, tokenHash, invitedBy, expiresAt.toISOString()]
  );
  return { id: rows[0].id, token, expiresAt, url: `${publicSiteOrigin()}/admin/invite/${token}` };
}

export async function getInvitationByToken(token: string) {
  const tokenHash = hashInviteToken(token);
  const { rows } = await query<{
    id: string;
    user_id: string;
    email: string;
    status: string;
    expires_at: string;
    accepted_at: string | null;
    first_name: string | null;
    last_name: string | null;
  }>(
    `SELECT i.id, i.user_id, i.email, i.status, i.expires_at, i.accepted_at,
            a.first_name, a.last_name
       FROM public.admin_invitations i
       JOIN public.admin_users a ON a.user_id = i.user_id
      WHERE i.token_hash = $1
      LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function acceptInvitation(token: string, password: string) {
  const invite = await getInvitationByToken(token);
  const status = classifyAdminInvite(invite);
  if (status !== 'valid' || !invite) {
    const message =
      status === 'expired'
        ? 'This invitation has expired. Ask an administrator to send a new one.'
        : status === 'used'
          ? 'This invitation has already been used.'
          : status === 'revoked'
            ? 'This invitation is no longer valid.'
            : 'This invitation link is not valid.';
    throw Object.assign(new Error(message), { status: 400 });
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE auth.users
          SET encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
              email_confirmed_at = COALESCE(email_confirmed_at, now()),
              updated_at = now()
        WHERE id = $1`,
      [invite.user_id, password]
    );
    await client.query(
      `UPDATE public.admin_users SET status = 'active', updated_at = NOW() WHERE user_id = $1`,
      [invite.user_id]
    );
    await client.query(
      `UPDATE public.admin_invitations
          SET status = 'accepted', accepted_at = NOW()
        WHERE id = $1`,
      [invite.id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return invite;
}

export async function upsertAdminIdentity(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  notes?: string;
  status: AdminUserStatus;
  createdBy: string;
  existingUserId?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    let userId = input.existingUserId || null;
    if (!userId) {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM auth.users WHERE lower(email) = $1 AND deleted_at IS NULL LIMIT 1`,
        [email]
      );
      userId = existing.rows[0]?.id || null;
    }
    if (!userId) {
      const created = await client.query<{ id: string }>(
        `INSERT INTO auth.users (
           instance_id, id, aud, role, email, encrypted_password,
           email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
           created_at, updated_at, is_sso_user, is_anonymous
         ) VALUES (
           '00000000-0000-0000-0000-000000000000',
           gen_random_uuid(), 'authenticated', 'authenticated', $1,
           extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
           now(),
           '{"provider":"email","providers":["email"]}'::jsonb,
           jsonb_build_object('role', 'admin'),
           now(), now(), false, false
         )
         RETURNING id`,
        [email]
      );
      userId = created.rows[0].id;
      await client.query(
        `INSERT INTO auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
         SELECT id, id::text, 'email',
           jsonb_build_object('sub', id::text, 'email', $2::text, 'email_verified', true, 'phone_verified', false),
           now(), now(), now()
         FROM (SELECT $1::uuid AS id) AS account`,
        [userId, email]
      );
    }

    const already = await client.query<{ user_id: string; status: string }>(
      `SELECT user_id, status FROM public.admin_users WHERE user_id = $1`,
      [userId]
    );
    if (already.rows[0]) {
      await client.query(
        `UPDATE public.admin_users
            SET first_name = $2, last_name = $3, phone = $4, notes = $5, email = $6, updated_at = NOW()
          WHERE user_id = $1`,
        [userId, input.firstName, input.lastName, input.phone || null, input.notes || null, email]
      );
    } else {
      await client.query(
        `INSERT INTO public.admin_users
           (user_id, email, role, first_name, last_name, phone, notes, status, created_by)
         VALUES ($1, $2, 'ADMIN', $3, $4, $5, $6, $7, $8)`,
        [userId, email, input.firstName, input.lastName, input.phone || null, input.notes || null, input.status, input.createdBy]
      );
    }
    await client.query('COMMIT');
    return { userId, email, existed: Boolean(already.rows[0]) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function registryPayload(): { tree: FeatureNode[] } {
  return { tree: permissionTree() };
}
