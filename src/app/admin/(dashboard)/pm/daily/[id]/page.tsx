'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DailyForm from '@/components/admin/pm/DailyForm';

export default function EditDailyPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  return (
    <Suspense>
      <div className="space-y-4">
        <AdminPageHeader title="Daily Update" description="Manager remarks are saved for Super Admin and Manager access." />
        {id ? <DailyForm updateId={id} /> : null}
      </div>
    </Suspense>
  );
}
