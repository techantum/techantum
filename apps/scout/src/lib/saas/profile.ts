import { q } from '@/lib/finance/db';
import { saveRevealeoMedia } from '@/lib/cms/media';
import { isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';

export type UserProfile = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
};

export async function getProfile(userId: string) {
  const { rows } = await q<{ name: string | null; avatar_url: string | null }>(
    undefined,
    `SELECT name, avatar_url FROM saas_profiles WHERE user_id=$1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function currentProfile(): Promise<UserProfile | null> {
  const actor = await getPlatformActor();
  if (!actor) return null;
  const stored = await getProfile(actor.userId);
  return {
    userId: actor.userId,
    email: actor.email,
    name: stored?.name?.trim() || actor.name,
    avatarUrl: stored?.avatar_url || null,
    role: actor.role,
  };
}

export async function saveProfile(userId: string, input: { name?: string; avatarUrl?: string | null }) {
  const name = String(input.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (input.name != null && name.length < 2) throw new Error('Enter a name of at least 2 characters.');
  const avatar = input.avatarUrl === undefined ? undefined : input.avatarUrl;
  await q(
    undefined,
    `INSERT INTO saas_profiles (user_id, name, avatar_url, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, saas_profiles.name),
       avatar_url = CASE WHEN $4::boolean THEN EXCLUDED.avatar_url ELSE saas_profiles.avatar_url END,
       updated_at = NOW()`,
    [userId, name || null, avatar ?? null, avatar !== undefined]
  );
  if (name) {
    await q(undefined, `UPDATE saas_memberships SET name=$2 WHERE user_id=$1`, [userId, name]).catch(() => undefined);
  }
  return currentProfile();
}

export async function saveProfilePhoto(userId: string, file: Blob) {
  const saved = await saveRevealeoMedia(file, 'cms');
  return saveProfile(userId, { avatarUrl: saved.url });
}

export async function listNotifications(userId: string, role?: string | null) {
  const scoped = isSuperAdmin(role)
    ? await q<{ id: string; action: string; created_at: string; entity_type: string }>(
      undefined,
      `SELECT id::text, action, created_at::text, entity_type
       FROM youtube_audit_logs
       ORDER BY created_at DESC
       LIMIT 12`
    ).catch(() => ({ rows: [] as { id: string; action: string; created_at: string; entity_type: string }[] }))
    : await q<{ id: string; action: string; created_at: string; entity_type: string }>(
      undefined,
      `SELECT id::text, action, created_at::text, entity_type
       FROM youtube_audit_logs
       WHERE actor_user_id=$1
       ORDER BY created_at DESC
       LIMIT 12`,
      [userId]
    ).catch(() => ({ rows: [] as { id: string; action: string; created_at: string; entity_type: string }[] }));

  return scoped.rows.map((row) => ({
    id: row.id,
    title: String(row.action || 'Update').replace(/^YouTube /i, ''),
    detail: row.entity_type ? row.entity_type.replace(/_/g, ' ') : 'Workspace',
    createdAt: row.created_at,
  }));
}
