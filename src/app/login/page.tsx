import { Suspense } from 'react';
import SiteLoginPanel from '@/components/auth/SiteLoginPanel';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />}>
          <SiteLoginPanel />
        </Suspense>
      </div>
    </main>
  );
}
