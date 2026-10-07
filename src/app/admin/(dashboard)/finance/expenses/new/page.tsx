import { redirect } from 'next/navigation';

export default function NewExpenseRedirectPage() {
  redirect('/admin/finance/receipts/new');
}
