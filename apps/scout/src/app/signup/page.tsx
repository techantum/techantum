import { Suspense } from 'react';
import AuthForm from '@/components/marketing/AuthForm';
import AuthShell from '@/components/marketing/AuthShell';

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
