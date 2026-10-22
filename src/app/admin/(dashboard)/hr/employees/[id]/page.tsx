'use client';

import { useParams } from 'next/navigation';
import EmployeeForm from '@/components/admin/hr/EmployeeForm';

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  return id ? <EmployeeForm employeeId={id} /> : null;
}
