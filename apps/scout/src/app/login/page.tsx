import { Suspense } from 'react';
import AuthForm from '@/components/marketing/AuthForm';
import AuthShell from '@/components/marketing/AuthShell';

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
