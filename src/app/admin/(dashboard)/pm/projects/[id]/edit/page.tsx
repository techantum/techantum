'use client';

import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ProjectForm from '@/components/admin/pm/ProjectForm';

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Edit Project" description="Moving a project to Ongoing or Delivered can require a manager override." />
      {id ? <ProjectForm projectId={id} /> : null}
    </div>
  );
}
