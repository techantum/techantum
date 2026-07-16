'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import RequirementQuickChat from '@/components/partner/RequirementQuickChat';
import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from '@/lib/partner/types';

interface RequirementDetail {
  requirement: Record<string, unknown>;
  answers: Record<string, unknown>;
  documents: { id: string; doc_type: string; format: string; content: string; created_at: string }[];
  prompt: { prompt_text: string } | null;
}

function RequirementDetailContent() {
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const [data, setData] = useState<RequirementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const submitted = searchParams?.get('submitted') === '1';

  useEffect(() => {
    fetch(`/api/partner/requirements/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  const downloadExport = (format: 'markdown' | 'pdf' | 'docx') => {
    window.open(`/api/partner/requirements/${id}/export?format=${format}`, '_blank');
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!data?.requirement) return <p className="text-red-600">Requirement not found.</p>;

  const req = data.requirement;
  const status = req.status as RequirementStatus;
  const sowDoc = data.documents.find((d) => d.format === 'markdown' && d.doc_type === 'sow');

  return (
    <div className="max-w-4xl space-y-6">
      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <Icon name="CheckCircleIcon" size={24} className="text-green-600 shrink-0" variant="solid" />
          <div>
            <p className="font-semibold text-green-800">Requirement Submitted Successfully</p>
            <p className="text-sm text-green-700">SOW generated and team notified. Reference: {String(req.reference_id)}</p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-indigo-600">{String(req.reference_id)}</p>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900 mt-1">
            {String(req.project_name || 'Untitled Project')}
          </h1>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {REQUIREMENT_STATUS_LABELS[status]}
          </span>
        </div>
        {status === 'draft' && (
          <Link
            href={`/partner/requirements/new?draft=${id}`}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
          >
            Continue Editing
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          ['Service', (req.partner_service_categories as { name?: string } | undefined)?.name ?? '—'],
          ['Package', (req.partner_packages as { name?: string } | undefined)?.name ?? '—'],
          ['Budget', req.budget_range ?? '—'],
          ['Industry', req.industry ?? '—'],
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-medium text-slate-900 mt-1">{String(value)}</p>
          </div>
        ))}
      </div>

      {status === 'need_clarification' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Icon name="ExclamationTriangleIcon" size={24} className="text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">Clarification Needed</p>
            <p className="text-sm text-amber-800 mt-1">
              Our team needs additional information. Please reply below.
            </p>
          </div>
        </div>
      )}

      {status !== 'draft' && (
        <RequirementQuickChat
          requirementId={id}
          apiBase="/api/partner/requirements"
          canReply
          referenceId={String(req.reference_id)}
          defaultOpen={status === 'need_clarification'}
        />
      )}

      {Boolean(req.proposal_sent_at) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h2 className="font-semibold text-indigo-900 mb-3">Project Proposal</h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <p className="text-indigo-600 text-xs">Estimated Investment</p>
              <p className="font-medium text-indigo-950">{String(req.proposal_amount || '—')}</p>
            </div>
            <div>
              <p className="text-indigo-600 text-xs">Timeline</p>
              <p className="font-medium text-indigo-950">{String(req.proposal_timeline || '—')}</p>
            </div>
          </div>
          {req.proposal_summary ? (
            <p className="text-sm text-indigo-900 whitespace-pre-wrap">{String(req.proposal_summary)}</p>
          ) : null}
          <p className="text-xs text-indigo-600 mt-3">
            Sent {new Date(String(req.proposal_sent_at)).toLocaleDateString('en-IN')}
          </p>
        </div>
      )}

      {sowDoc && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-slate-900">Scope of Work</h2>
            <div className="flex flex-wrap gap-2">
              {(['markdown', 'pdf', 'docx'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => downloadExport(fmt)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-50"
                >
                  <Icon name="ArrowDownTrayIcon" size={14} />
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="prose prose-sm max-w-none bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto text-sm whitespace-pre-wrap font-mono">
            {sowDoc.content.slice(0, 3000)}
            {sowDoc.content.length > 3000 && '…'}
          </div>
        </div>
      )}

      {data.prompt && (
        <details className="bg-white rounded-xl border border-slate-200 p-5">
          <summary className="font-semibold text-slate-900 cursor-pointer">AI Prompt (for reference)</summary>
          <pre className="mt-4 text-xs bg-slate-50 p-4 rounded-lg overflow-x-auto max-h-64">
            {data.prompt.prompt_text.slice(0, 2000)}…
          </pre>
        </details>
      )}

      <Link href="/partner/requirements" className="text-sm text-slate-500 hover:text-indigo-600">
        ← Back to requirements
      </Link>
    </div>
  );
}

export default function RequirementDetailPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <RequirementDetailContent />
    </Suspense>
  );
}
