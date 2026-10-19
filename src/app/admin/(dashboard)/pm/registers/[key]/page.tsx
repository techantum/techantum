'use client';

import { useParams } from 'next/navigation';
import { RegisterList } from '@/components/admin/pm/RegisterScreen';

export default function RegisterListPage() {
  const params = useParams<{ key: string }>();
  return params?.key ? <RegisterList registerKey={params.key} /> : null;
}
