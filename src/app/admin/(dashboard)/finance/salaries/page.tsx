import { redirect } from 'next/navigation';

export default function SalariesRedirectPage() {
  redirect('/admin/finance/payslips');
}
