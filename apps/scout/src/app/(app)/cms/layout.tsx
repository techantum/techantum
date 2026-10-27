import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor || !isSuperAdmin(actor.role)) redirect('/home');
  return children;
}
