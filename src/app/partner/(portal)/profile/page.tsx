'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PARTNER_TIER_LABELS,
  PARTNER_TYPE_LABELS,
  type Partner,
  type PartnerUser,
} from '@/lib/partner/types';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function PartnerProfilePage() {
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    fetch('/api/partner/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setPartner(data.partner);
        setPartnerUser(data.partnerUser);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const isAdmin = partnerUser?.role === 'partner_admin';

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/partner/logo', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPartner((prev) => (prev ? { ...prev, logo_url: data.url } : prev));
      setMessage('Partner logo updated. It now appears on login and the dashboard.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/partner/logo', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not remove logo');
      setPartner((prev) => (prev ? { ...prev, logo_url: null } : prev));
      setMessage('Partner logo removed.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove logo');
    } finally {
      setUploading(false);
    }
  };

  if (!partner) {
    return <p className="text-slate-500">Loading profile…</p>;
  }

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        kicker="Partner portal"
        title="Partner profile"
        description="Company details and portal branding."
      />

      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-900">Partner logo</p>
        <p className="mb-4 text-xs text-slate-500">
          This logo is shown in the header, footer, and partner login.
        </p>
        <div className="flex items-center gap-4 mb-4">
          <span className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 min-w-[96px] min-h-[72px]">
            <PartnerBrandMark logoUrl={partner.logo_url} companyName={partner.company_name} size="lg" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{partner.company_name}</p>
            <p className="text-xs text-slate-500">{partner.logo_url ? 'Custom logo' : 'Using company initial until a logo is uploaded'}</p>
          </div>
        </div>
        {isAdmin ? (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadLogo(file);
                e.target.value = '';
              }}
              className="block w-full text-sm"
            />
            {partner.logo_url ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void removeLogo()}
                className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
              >
                Remove logo
              </button>
            ) : null}
            {uploading ? <p className="text-xs text-slate-500">Uploading…</p> : null}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Ask a partner admin to change the company logo.</p>
        )}
        {message ? (
          <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        ) : null}
      </div>

      <div className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white shadow-sm">
        {[
          ['Partner ID', partner.partner_code],
          ['Company', partner.company_name],
          ['Contact', partner.contact_name],
          ['Email', partner.email],
          ['Phone', partner.phone || '—'],
          ['Type', PARTNER_TYPE_LABELS[partner.partner_type]],
          ['Tier', PARTNER_TIER_LABELS[partner.tier]],
          ['Country', partner.country || '—'],
          ['Status', partner.status],
          ['Joined', partner.joined_at ? new Date(partner.joined_at).toLocaleDateString('en-IN') : '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between px-5 py-3 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900 text-right">{value}</span>
          </div>
        ))}
      </div>
      </div>
      {partnerUser && (
        <p className="text-xs text-slate-400">
          Logged in as {partnerUser.full_name} ({partnerUser.email})
        </p>
      )}
    </div>
  );
}
