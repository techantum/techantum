'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminButton from '@/components/admin/AdminButton';
import { FinanceShell, FinanceTd, FinanceTh, Pager, StatusBadge, money } from '@/components/admin/finance/FinanceUi';

export default function TransactionsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [q, setQ] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(page) });
    if (type) params.set('type', type);
    if (q) params.set('q', q);
    fetch(`/api/admin/finance/transactions?${params}`).then((r) => r.json()).then((b) => {
      setRows(b.rows || []);
      setTotal(b.total || 0);
    });
  };
  useEffect(() => { load(); }, [page, type]);

  return (
    <FinanceShell>
      <AdminPageHeader title="Transactions" description="Money in from invoice payments. Money out from receipts. Created automatically — do not enter duplicates." />
      <AdminSection title="Register">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={`${adminInputClass} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description or reference" onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className={`${adminSelectClass} w-48`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {['invoice_payment','receipt_payment','salary_payment','refund','other'].map((t) => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
          <AdminButton onClick={load}>Search</AdminButton>
        </div>
        <table className="w-full">
          <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Type</FinanceTh><FinanceTh>Reference</FinanceTh><FinanceTh>Client / Vendor</FinanceTh><FinanceTh>Description</FinanceTh><FinanceTh>Money In</FinanceTh><FinanceTh>Money Out</FinanceTh><FinanceTh>Mode</FinanceTh><FinanceTh>Bank</FinanceTh><FinanceTh>Txn Ref</FinanceTh></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <FinanceTd>{r.transaction_date}</FinanceTd>
                <FinanceTd>{r.transaction_type.replace(/_/g, ' ')}</FinanceTd>
                <FinanceTd>{r.reference_type || '—'}</FinanceTd>
                <FinanceTd>{r.party_name || '—'}</FinanceTd>
                <FinanceTd>{r.description}</FinanceTd>
                <FinanceTd>{Number(r.money_in) ? money(r.money_in) : '—'}</FinanceTd>
                <FinanceTd>{Number(r.money_out) ? money(r.money_out) : '—'}</FinanceTd>
                <FinanceTd>{r.payment_mode || '—'}</FinanceTd>
                <FinanceTd>{r.bank_account || '—'}</FinanceTd>
                <FinanceTd>{r.transaction_reference || '—'}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} pageSize={25} total={total} onPage={setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
