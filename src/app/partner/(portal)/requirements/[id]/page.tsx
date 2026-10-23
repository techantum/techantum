'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import RequirementQuickChat from '@/components/partner/RequirementQuickChat';
import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from '@/lib/partner/types';
import { stripVendorBranding } from '@/lib/partner/document-branding';

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
  const sowPreview = sowDoc?.content ? stripVendorBranding(sowDoc.content) : '';

  const proposalReady = Boolean(req.proposal_sent_at);
  const quotationReady = status === 'approved' || status === 'won';

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-6">
      <div>
        <Link
          href="/partner/requirements"
          className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-secondary"
        >
          <Icon name="ArrowLeftIcon" size={16} />
          Back to Requirements
        </Link>
        {submitted && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <Icon name="CheckCircleIcon" size={24} className="shrink-0 text-green-600" variant="solid" />
            <div>
              <p className="font-semibold text-green-800">Requirement submitted successfully</p>
              <p className="text-sm text-green-700">Our team will review this and send a proposal with timeline and cost. Reference: {String(req.reference_id)}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-semibold text-secondary">{String(req.reference_id)}</p>
            <h1 className="mt-1 font-bricolage text-3xl font-bold tracking-tight text-slate-900">
              {String(req.project_name || 'Untitled Project')}
            </h1>
            <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-secondary">
              {REQUIREMENT_STATUS_LABELS[status]}
            </span>
          </div>
          {status === 'draft' ? (
            <Link
              href={`/partner/requirements/new?draft=${id}`}
              className="rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90"
            >
              Continue Editing
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Proposal</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{proposalReady ? 'Received' : 'Pending'}</p>
          <p className="text-xs text-slate-500">{proposalReady ? `Sent ${new Date(String(req.proposal_sent_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Waiting for team review'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quotation</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{quotationReady ? 'Sent' : 'Pending'}</p>
          <p className="text-xs text-slate-500">{quotationReady ? 'Final quotation is available from the document export.' : 'Sent by email after proposal approval'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Package</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{String((req.partner_packages as { name?: string } | undefined)?.name ?? '—')}</p>
          <p className="text-xs text-slate-500">{String((req.partner_service_categories as { name?: string } | undefined)?.name ?? '—')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {([
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
        <div className="h-[28rem] xl:hidden">
          <RequirementQuickChat
            requirementId={id}
            apiBase="/api/partner/requirements"
            canReply
            referenceId={String(req.reference_id)}
            defaultOpen
            variant="sidebar"
          />
        </div>
      )}

      {Boolean(req.proposal_sent_at) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Project Proposal</h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <p className="text-secondary text-xs">Estimated Investment</p>
              <p className="font-medium text-slate-900">{String(req.proposal_amount || '—')}</p>
            </div>
            <div>
              <p className="text-secondary text-xs">Timeline</p>
              <p className="font-medium text-slate-900">{String(req.proposal_timeline || '—')}</p>
            </div>
          </div>
          {req.proposal_summary ? (
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{String(req.proposal_summary)}</p>
          ) : null}
          <p className="text-xs text-secondary mt-3">
            Sent {new Date(String(req.proposal_sent_at)).toLocaleDateString('en-IN')}
          </p>
        </div>
      )}

      {sowPreview && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Scope of Work</h2>
            <div className="flex flex-wrap gap-2">
              {(['markdown', 'pdf', 'docx'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => downloadExport(fmt)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                >
                  <Icon name="ArrowDownTrayIcon" size={14} />
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="prose prose-sm max-h-96 max-w-none overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">
            {sowPreview.slice(0, 4000)}
            {sowPreview.length > 4000 && '…'}
          </div>
        </div>
      )}

      </div>
      {status !== 'draft' ? (
        <aside className="hidden h-[calc(100vh-7rem)] w-[22rem] shrink-0 xl:sticky xl:top-24 xl:block">
          <RequirementQuickChat
            requirementId={id}
            apiBase="/api/partner/requirements"
            canReply
            referenceId={String(req.reference_id)}
            defaultOpen
            variant="sidebar"
          />
        </aside>
      ) : null}
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
