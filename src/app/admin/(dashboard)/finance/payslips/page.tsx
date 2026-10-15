import { redirect } from 'next/navigation';

export default function FinancePayslipsRedirect() {
  redirect('/admin/hr/payslips');
}
