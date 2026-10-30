import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
      <AdminPageHeader title="403 — Access Denied" />
      <p className="text-sm text-slate-600">
        You don&apos;t have permission to access this feature. Contact your administrator if you require access.
      </p>
      <Link href="/admin" className="btn-primary inline-flex">Back to Dashboard</Link>
    </div>
  );
}
