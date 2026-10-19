'use client';

import { useParams } from 'next/navigation';
import { RegisterForm } from '@/components/admin/pm/RegisterScreen';

export default function NewRegisterPage() {
  const params = useParams<{ key: string }>();
  return params?.key ? <RegisterForm registerKey={params.key} /> : null;
}
