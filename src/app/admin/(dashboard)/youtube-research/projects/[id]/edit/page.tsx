'use client';

import { useParams } from 'next/navigation';
import ProjectForm from '@/components/admin/youtube/ProjectForm';

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  return <ProjectForm projectId={params?.id || ''} />;
}
