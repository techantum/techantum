'use client';

import { Suspense } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DailyForm from '@/components/admin/pm/DailyForm';

export default function NewDailyPage() {
  return (
    <Suspense>
      <div className="space-y-4">
        <AdminPageHeader title="Daily Update" description="Ongoing projects need RAG, completion, work done and today's plan." />
        <DailyForm />
      </div>
    </Suspense>
  );
}
