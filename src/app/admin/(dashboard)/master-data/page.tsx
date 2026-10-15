'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminInputClass } from '@/components/admin/AdminField';
import { FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';

interface MasterList {
  list_key: string;
  label: string;
  description: string | null;
}

interface MasterItem {
  id: string;
  list_key: string;
  item_key: string;
  label: string;
  parent_key: string | null;
  sort_order: number;
  active: boolean;
}

export default function MasterDataPage() {
  const [lists, setLists] = useState<MasterList[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [selected, setSelected] = useState('project_type');
  const [label, setLabel] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [parentKey, setParentKey] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    fetch('/api/admin/master-data')
      .then((response) => response.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setLists(body.lists || []);
        setItems(body.items || []);
        setSelected((current) => current || body.lists?.[0]?.list_key || 'project_type');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load master data'));
  };

  useEffect(() => { load(); }, []);

  const list = lists.find((row) => row.list_key === selected);
  const rows = useMemo(
    () => items.filter((row) => row.list_key === selected).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    [items, selected]
  );

  const saveNew = async () => {
    setError('');
    setMessage('');
    const response = await fetch('/api/admin/master-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_key: selected, label, item_key: itemKey || undefined, parent_key: parentKey || undefined }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not add the value');
      return;
    }
    setLabel('');
    setItemKey('');
    setParentKey('');
    setMessage('Value added. It is available in the related dropdowns.');
    load();
  };

  const patch = async (id: string, change: Partial<MasterItem>) => {
    setError('');
    const response = await fetch('/api/admin/master-data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...change }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not update the value');
      return;
    }
    setItems((current) => current.map((row) => (row.id === id ? { ...row, ...body } : row)));
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Master Data"
        description="Dropdown values used across the admin. Existing values are already loaded. Add or edit labels here, and the related screens pick them up."
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {message && <AdminAlert>{message}</AdminAlert>}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <AdminSection title="Lists" icon="QueueListIcon">
          <div className="space-y-1">
            {lists.map((row) => (
              <button
                key={row.list_key}
                type="button"
                onClick={() => setSelected(row.list_key)}
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${selected === row.list_key ? 'bg-orange-50 font-semibold text-secondary' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {row.label}
              </button>
            ))}
          </div>
        </AdminSection>
        <AdminSection title={list?.label || 'Values'} icon="PencilSquareIcon" description={list?.description || ''}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input className={adminInputClass} placeholder="Label" value={label} onChange={(event) => setLabel(event.target.value)} />
            <input className={adminInputClass} placeholder="Stored value (optional)" value={itemKey} onChange={(event) => setItemKey(event.target.value)} />
            <input className={adminInputClass} placeholder="Parent, for packages" value={parentKey} onChange={(event) => setParentKey(event.target.value)} />
            <AdminButton variant="primary" onClick={saveNew} disabled={!label.trim()}>Add value</AdminButton>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <FinanceTh>Label</FinanceTh>
                <FinanceTh>Stored value</FinanceTh>
                <FinanceTh>Parent</FinanceTh>
                <FinanceTh>Status</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <FinanceTd>
                    <input className={adminInputClass} defaultValue={row.label} onBlur={(event) => {
                      if (event.target.value.trim() && event.target.value !== row.label) patch(row.id, { label: event.target.value.trim() });
                    }} />
                  </FinanceTd>
                  <FinanceTd><span className="font-mono text-xs text-slate-500">{row.item_key}</span></FinanceTd>
                  <FinanceTd>
                    <input className={adminInputClass} defaultValue={row.parent_key || ''} placeholder="—" onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next !== (row.parent_key || '')) patch(row.id, { parent_key: next });
                    }} />
                  </FinanceTd>
                  <FinanceTd>
                    <button type="button" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`} onClick={() => patch(row.id, { active: !row.active })}>
                      {row.active ? 'Active' : 'Hidden'}
                    </button>
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminSection>
      </div>
    </div>
  );
}
