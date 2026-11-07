'use client';

import { useParams } from 'next/navigation';
import EmployeeForm from '@/components/admin/hr/EmployeeForm';

export default function EditEmployeePage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug || '');
  return slug ? <EmployeeForm employeeSlug={slug} /> : null;
}
