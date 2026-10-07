import { redirect } from 'next/navigation';

export default async function ExpenseRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/finance/receipts/${id}`);
}
