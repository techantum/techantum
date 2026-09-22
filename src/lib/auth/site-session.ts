import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureClientWorkspace } from '@/lib/whatsapp-provider/services/self-onboard';

export async function issueSiteSessionForUser(input: {
  email: string;
  name?: string;
  phone?: string;
  method: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw Object.assign(new Error('A verified email is required to sign in.'), { status: 400 });
  }

  let user: User | null = null;
  const created = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    ...(input.phone ? { phone: input.phone, phone_confirm: true } : {}),
    user_metadata: {
      full_name: input.name || '',
      login_method: input.method,
      ...(input.metadata || {}),
    },
  });

  if (created.data.user) {
    user = created.data.user;
  } else {
    const existing = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
    user = existing.data.user || null;
    if (!user) {
      throw new Error(created.error?.message || existing.error?.message || 'Could not create your account.');
    }
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        full_name: input.name || user.user_metadata?.full_name,
        login_method: input.method,
        ...(input.metadata || {}),
      },
    });
  }

  await ensureClientWorkspace(user);
  const link = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data.properties?.hashed_token;
  if (!tokenHash) throw new Error(link.error?.message || 'Could not start your session.');
  return { tokenHash, email };
}

export function jsonError(err: unknown) {
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: number }).status) || 400 : 400;
  return { error: err instanceof Error ? err.message : 'Sign-in failed.', status };
}
