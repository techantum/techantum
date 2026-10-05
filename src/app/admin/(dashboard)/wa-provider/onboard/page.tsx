import { redirect } from 'next/navigation';

export default function AdminOnboardRedirect() {
  redirect('/admin/wa-provider/clients');
}
