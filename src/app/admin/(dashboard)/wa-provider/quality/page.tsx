'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

export default function QualityPage() {
  const [phones, setPhones] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/admin/wa-provider/quality').then((r) => r.json()).then((b) => {
      setPhones(b.phones || []);
      setHistory(b.history || []);
    });
  }, []);
  const groups = ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'];
  return (
    <ProviderShell>
      <AdminPageHeader title="Quality Monitor" description="Phone quality history and downgrade alerts. Platform monitoring only." />
      {groups.map((group) => (
        <AdminSection key={group} title={group} accent={group === 'GREEN' ? 'emerald' : group === 'YELLOW' ? 'amber' : group === 'RED' ? 'rose' : 'indigo'}>
          <ProviderTable
            columns={['Client', 'Phone', 'Quality', 'Registration']}
            rows={phones.filter((p) => (p.quality_rating || 'UNKNOWN').toUpperCase() === group || (group === 'UNKNOWN' && !['GREEN', 'YELLOW', 'RED'].includes((p.quality_rating || '').toUpperCase()))).map((row) => (
              <tr key={row.id}>
                <Td>{row.wa_clients?.name || '—'}</Td>
                <Td>{row.display_phone_number}</Td>
                <Td><StatusPill value={row.quality_rating} /></Td>
                <Td><StatusPill value={row.registration_status} /></Td>
              </tr>
            ))}
          />
        </AdminSection>
      ))}
      <AdminSection title="Quality history">
        <ProviderTable
          columns={['Phone', 'Change', 'When']}
          rows={history.map((row) => (
            <tr key={row.id}>
              <Td>{row.wa_phone_numbers?.display_phone_number || row.phone_number_id}</Td>
              <Td>{row.previous_quality} → {row.new_quality}</Td>
              <Td>{when(row.occurred_at)}</Td>
            </tr>
          ))}
        />
      </AdminSection>
    </ProviderShell>
  );
}
