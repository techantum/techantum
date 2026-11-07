'use client';

import { use } from 'react';
import EstimateForm from '@/components/admin/cost-center/EstimateForm';

export default function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EstimateForm estimateId={id} />;
}
