import { redirect } from 'next/navigation';
import { canManageTeam, isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_TEAM, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  if (isSuperAdmin(actor.role)) redirect('/subscribers');
  const access = await resolveAccess(actor.account, actor.role);
  if (!access.has(FEATURE_TEAM) || !canManageTeam(actor.role)) redirect('/home');
  return children;
}
