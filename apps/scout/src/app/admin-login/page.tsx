import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/marketing/AuthForm';
import AuthShell from '@/components/marketing/AuthShell';
import { afterAuthPath } from '@/lib/saas/session';
import { websiteSession } from '@/lib/saas/website-session';

export default async function PlatformAdminLoginPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const [params, session] = await Promise.all([searchParams, websiteSession()]);
  if (session.actor) redirect(afterAuthPath(params.package, session.actor.account, session.actor.role));
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="login" portal="admin" />
      </Suspense>
    </AuthShell>
  );
}
