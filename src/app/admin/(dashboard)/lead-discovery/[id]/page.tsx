'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import LeadExportMenu from '@/components/admin/lead-discovery/LeadExportMenu';
import LeadResultsTable from '@/components/admin/lead-discovery/LeadResultsTable';
import { displaySearchName } from '@/lib/places/sheet-data';
import type { LeadDiscoveryResultRow, LeadDiscoveryRun } from '@/lib/places/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LeadDiscoveryDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [run, setRun] = useState<LeadDiscoveryRun | null>(null);
  const [results, setResults] = useState<LeadDiscoveryResultRow[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/lead-discovery/runs/${id}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load search');
        setRun(body.run);
        setResults(body.results ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load search'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="w-full space-y-6">
      <Link
        href="/admin/lead-discovery"
        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← All saved searches
      </Link>

      <AdminPageHeader
        title={run ? displaySearchName(run) : 'Search details'}
        description={run ? `${run.text_query} · ${formatDate(run.created_at)}` : 'Loading the saved lead list.'}
        action={run ? <LeadExportMenu runId={run.id} run={run} results={results} onMessage={setMessage} onError={setError} /> : null}
      />

      {message && <AdminAlert variant="success">{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection
        title="Lead list"
        description={run ? `${results.length} result${results.length === 1 ? '' : 's'} from this saved search.` : undefined}
        accent="violet"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading list…</p>
        ) : (
          <LeadResultsTable results={results} />
        )}
      </AdminSection>
    </div>
  );
}
