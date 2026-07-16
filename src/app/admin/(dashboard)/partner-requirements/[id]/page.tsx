'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import ClarificationThread from '@/components/partner/ClarificationThread';
import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from '@/lib/partner/types';

interface DetailData {
  requirement: Record<string, unknown>;
  answers: Record<string, unknown>;
  documents: { id: string; doc_type: string; format: string; content: string; version: number; created_at: string }[];
  prompts: { id: string; prompt_text: string; version: number; created_at: string }[];
  statusHistory: { from_status: string | null; to_status: string; note: string | null; created_at: string }[];
}

export default function AdminPartnerRequirementDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [proposalSummary, setProposalSummary] = useState('');
  const [proposalAmount, setProposalAmount] = useState('');
  const [proposalTimeline, setProposalTimeline] = useState('');
  const [sendingProposal, setSendingProposal] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [requestingClarification, setRequestingClarification] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/partner-requirements/${id}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setInternalNotes(String(res.requirement?.internal_notes ?? ''));
        setProposalSummary(String(res.requirement?.proposal_summary ?? ''));
        setProposalAmount(String(res.requirement?.proposal_amount ?? ''));
        setProposalTimeline(String(res.requirement?.proposal_timeline ?? ''));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNotes = async () => {
    await fetch(`/api/admin/partner-requirements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internal_notes: internalNotes }),
    });
    setMessage('Notes saved.');
  };

  const regenerate = async () => {
    setRegenerating(true);
    setMessage('');
    const res = await fetch(`/api/admin/partner-requirements/${id}`, { method: 'POST' });
    const body = await res.json();
    setRegenerating(false);
    if (!res.ok) {
      setMessage(body.error || 'Regeneration failed');
      return;
    }
    setMessage(`SOW regenerated (v${body.version}).`);
    load();
  };

  const sendProposal = async () => {
    setSendingProposal(true);
    setMessage('');
    const res = await fetch(`/api/admin/partner-requirements/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_proposal',
        proposalSummary,
        proposalAmount,
        proposalTimeline,
      }),
    });
    const body = await res.json();
    setSendingProposal(false);
    if (!res.ok) {
      setMessage(body.error || 'Failed to send proposal');
      return;
    }
    setMessage('Proposal sent to partner.');
    load();
  };

  const requestClarification = async () => {
    if (!clarificationMessage.trim()) return;
    setRequestingClarification(true);
    setMessage('');
    const res = await fetch(`/api/admin/partner-requirements/${id}/clarifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: clarificationMessage.trim() }),
    });
    const body = await res.json();
    setRequestingClarification(false);
    if (!res.ok) {
      setMessage(body.error || 'Failed to request clarification');
      return;
    }
    setClarificationMessage('');
    setMessage('Clarification request sent to partner.');
    load();
  };

  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data?.requirement) {
    return <p className="text-muted-foreground text-sm">Loading requirement…</p>;
  }

  const req = data.requirement;
  const status = req.status as RequirementStatus;
  const sowDoc = [...data.documents]
    .filter((d) => d.doc_type === 'sow' && d.format === 'markdown')
    .sort((a, b) => b.version - a.version)[0];
  const latestPrompt = [...data.prompts].sort((a, b) => b.version - a.version)[0];

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title={String(req.project_name || 'Requirement Detail')}
        description={`Reference ${String(req.reference_id)}`}
      />

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/partner-requirements"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to requirements
        </Link>
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {regenerating ? 'Regenerating…' : 'Regenerate SOW'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          ['Status', REQUIREMENT_STATUS_LABELS[status] ?? status],
          ['Partner', (req.partners as { company_name?: string })?.company_name ?? '—'],
          ['Service', (req.partner_service_categories as { name?: string })?.name ?? '—'],
          ['Package', (req.partner_packages as { name?: string })?.name ?? '—'],
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium mt-1">{value}</p>
          </div>
        ))}
      </div>

      <AdminSection title="Internal Notes" description="Visible to admin team only">
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm"
          placeholder="Add internal notes…"
        />
        <button
          type="button"
          onClick={saveNotes}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted"
        >
          Save Notes
        </button>
      </AdminSection>

      {status !== 'draft' && (
        <AdminSection title="Clarifications" description="Request additional information from the partner">
          <textarea
            value={clarificationMessage}
            onChange={(e) => setClarificationMessage(e.target.value)}
            rows={3}
            placeholder="What information do you need from the partner?"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm mb-3"
          />
          <button
            type="button"
            onClick={requestClarification}
            disabled={requestingClarification || !clarificationMessage.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted disabled:opacity-50 mb-4"
          >
            {requestingClarification ? 'Sending…' : 'Request Clarification'}
          </button>
          <ClarificationThread
            requirementId={id}
            apiBase="/api/admin/partner-requirements"
            canReply={false}
          />
        </AdminSection>
      )}

      {status !== 'draft' && (
        <AdminSection title="Send Proposal" description="Prepare and email a project proposal to the partner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={proposalAmount}
              onChange={(e) => setProposalAmount(e.target.value)}
              placeholder="Estimated investment (e.g. ₹15L - ₹25L)"
              className="px-3 py-2 rounded-lg border border-border text-sm"
            />
            <input
              value={proposalTimeline}
              onChange={(e) => setProposalTimeline(e.target.value)}
              placeholder="Timeline (e.g. 12-16 weeks)"
              className="px-3 py-2 rounded-lg border border-border text-sm"
            />
          </div>
          <textarea
            value={proposalSummary}
            onChange={(e) => setProposalSummary(e.target.value)}
            rows={4}
            placeholder="Proposal summary and next steps…"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm"
          />
          <button
            type="button"
            onClick={sendProposal}
            disabled={sendingProposal || !proposalSummary.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {sendingProposal ? 'Sending…' : 'Send Proposal to Partner'}
          </button>
          {req.proposal_sent_at ? (
            <p className="text-xs text-muted-foreground">
              Last sent {new Date(String(req.proposal_sent_at)).toLocaleString()}
            </p>
          ) : null}
        </AdminSection>
      )}

      {sowDoc && (
        <AdminSection title="Scope of Work" description={`Version ${sowDoc.version}`}>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => downloadMarkdown(sowDoc.content, `${req.reference_id}-SOW-v${sowDoc.version}.md`)}
              className="text-sm text-primary hover:underline"
            >
              Download Markdown
            </button>
          </div>
          <pre className="text-xs bg-muted/40 rounded-lg p-4 max-h-96 overflow-y-auto whitespace-pre-wrap">
            {sowDoc.content}
          </pre>
        </AdminSection>
      )}

      <AdminSection title="Questionnaire Answers">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {Object.entries(data.answers).map(([key, value]) => (
            <div key={key} className="border border-border/60 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-mono">{key}</p>
              <p className="mt-1 break-words">
                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
              </p>
            </div>
          ))}
        </div>
      </AdminSection>

      {latestPrompt && (
        <AdminSection title="AI Prompt" description={`Version ${latestPrompt.version}`}>
          <pre className="text-xs bg-muted/40 rounded-lg p-4 max-h-64 overflow-y-auto whitespace-pre-wrap">
            {latestPrompt.prompt_text}
          </pre>
        </AdminSection>
      )}

      {data.statusHistory.length > 0 && (
        <AdminSection title="Status History">
          <ul className="space-y-2 text-sm">
            {data.statusHistory.map((h, i) => (
              <li key={i} className="flex gap-2 text-muted-foreground">
                <span className="font-mono text-xs shrink-0">
                  {new Date(h.created_at).toLocaleString()}
                </span>
                <span>
                  {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
                  {h.note ? ` — ${h.note}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}
    </div>
  );
}
