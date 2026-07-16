'use client';

import { useEffect, useState } from 'react';
import {
  PARTNER_TIER_LABELS,
  PARTNER_TYPE_LABELS,
  type Partner,
  type PartnerUser,
} from '@/lib/partner/types';

export default function PartnerProfilePage() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setPartner(data.partner);
        setPartnerUser(data.partnerUser);
      });
  }, []);

  if (!partner) {
    return <p className="text-slate-500">Loading profile…</p>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-6">Partner Profile</h1>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
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
      {partnerUser && (
        <p className="text-xs text-slate-400 mt-4">
          Logged in as {partnerUser.full_name} ({partnerUser.email})
        </p>
      )}
    </div>
  );
}
