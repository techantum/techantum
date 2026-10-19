'use client';

import { useParams } from 'next/navigation';
import { RegisterForm } from '@/components/admin/pm/RegisterScreen';

export default function RegisterRecordPage() {
  const params = useParams<{ key: string; id: string }>();
  if (!params?.key || !params.id) return null;
  return <RegisterForm registerKey={params.key} recordId={params.id} />;
}
