import { redirect } from 'next/navigation';

export default function IncomeRedirectPage() {
  redirect('/admin/finance/invoices');
}
