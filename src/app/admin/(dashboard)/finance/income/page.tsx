import { redirect } from 'next/navigation';

export default function IncomePage() {
  redirect('/admin/finance/transactions/income');
}
