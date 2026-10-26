import { redirect } from 'next/navigation';
import { canManageTeam, isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  if (isSuperAdmin(actor.role)) redirect('/subscribers');
  if (!canManageTeam(actor.role)) redirect('/home');
  return children;
}
