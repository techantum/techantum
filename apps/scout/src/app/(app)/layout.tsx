import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { entitlementsFor, getPlatformActor } from '@/lib/saas/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const access = entitlementsFor(actor.account);
  return (
    <Shell name={actor.name} plan={access.active ? access.plan.name : 'Inactive'} role={actor.role}>
      {children}
    </Shell>
  );
}
