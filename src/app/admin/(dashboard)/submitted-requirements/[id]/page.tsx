'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { REQUIREMENT_STATUS_LABELS, type RequirementAttachment, type RequirementTemplate } from '@/lib/client-requirements/types';

interface Detail {
  requirement: { id: string; status: string; completion_percent: number; submitted_at: string | null; clarification_sections: string[] };
  project: { project_code: string; project_name: string; company_name: string; client_name: string; email: string; project_type: string; package_name: string | null };
  template: RequirementTemplate | null;
  answers: Record<string, Record<string, unknown>>;
  attachments: RequirementAttachment[];
  comments: { id: string; section_slug: string | null; author_type: string; comment: string; created_at: string }[];
  versions: { id: string; version_number: number; status: string; created_at: string }[];
}

function stringify(value: unknown) {
  if (Array.isArray(value)) return value.length ? JSON.stringify(value, null, 2) : '';
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value ?? '');
}

export default function SubmittedRequirementDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [clarificationSections, setClarificationSections] = useState<string[]>([]);
  const [clarificationComment, setClarificationComment] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    fetch(`/api/admin/requirements/${id}`).then((r) => r.json()).then((data) => {
      setDetail(data);
      setStatus(data.requirement?.status || '');
      setClarificationSections(data.requirement?.clarification_sections || []);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async () => {
    const res = await fetch(`/api/admin/requirements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    const body = await res.json();
    setMessage(res.ok ? 'Status updated.' : body.error || 'Update failed');
    load();
  };

  const requestChanges = async () => {
    const res = await fetch(`/api/admin/requirements/${id}/request-changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: clarificationSections, comment: clarificationComment }),
    });
    const body = await res.json();
    setMessage(res.ok ? 'Clarification request recorded.' : body.error || 'Request failed');
    load();
  };

  if (!detail?.requirement) return <p className="text-sm text-muted-foreground">Loading requirement...</p>;

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader title={detail.project.project_name} description={`${detail.project.company_name} - ${detail.project.project_code}`} />
      <Link href="/admin/submitted-requirements" className="text-sm text-muted-foreground hover:text-primary">Back to submitted requirements</Link>
      {message && <p className="text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg">{message}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Status', REQUIREMENT_STATUS_LABELS[detail.requirement.status as keyof typeof REQUIREMENT_STATUS_LABELS] ?? detail.requirement.status],
          ['Progress', `${detail.requirement.completion_percent}%`],
          ['Project Type', detail.project.project_type],
          ['Package', detail.project.package_name || 'No package'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium mt-1">{value}</p>
          </div>
        ))}
      </div>
      <AdminSection title="Review Actions" description="Update status or request edits to selected sections.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm">
            {Object.entries(REQUIREMENT_STATUS_LABELS).filter(([key]) => key !== 'draft').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="rounded-lg border border-border px-3 py-2 text-sm" />
          <button onClick={updateStatus} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Update Status</button>
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-medium">Clarification Workflow</p>
          <div className="flex flex-wrap gap-2">
            {detail.template?.requirement_sections?.map((section) => (
              <label key={section.slug} className="flex items-center gap-2 text-xs rounded-full border border-border px-3 py-1.5">
                <input type="checkbox" checked={clarificationSections.includes(section.slug)} onChange={(e) => setClarificationSections((prev) => e.target.checked ? [...prev, section.slug] : prev.filter((item) => item !== section.slug))} />
                {section.title}
              </label>
            ))}
          </div>
          <textarea value={clarificationComment} onChange={(e) => setClarificationComment(e.target.value)} rows={2} placeholder="Example: Please upload a higher resolution logo." className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <button onClick={requestChanges} disabled={!clarificationComment.trim()} className="rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Request Changes</button>
        </div>
      </AdminSection>
      <AdminSection title="Exports" description="Download submitted data in common review formats.">
        <div className="flex flex-wrap gap-3">
          <a href={`/api/admin/requirements/${id}/export?format=pdf`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Export PDF</a>
          <a href={`/api/admin/requirements/${id}/export?format=docx`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Export DOCX</a>
          <a href={`/api/admin/requirements/${id}/export?format=json`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Export JSON</a>
        </div>
      </AdminSection>
      <AdminSection title="Submitted Data">
        <div className="space-y-3">
          {detail.template?.requirement_sections?.map((section) => (
            <details key={section.slug} open className="rounded-lg border border-border p-4">
              <summary className="cursor-pointer font-medium">{section.title}</summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.requirement_questions?.map((question) => (
                  <div key={question.id} className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{question.label}</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-sm font-sans">{stringify(detail.answers[section.slug]?.[question.question_key]) || '-'}</pre>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="Attachments" description={`${detail.attachments.length} uploaded file(s)`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detail.attachments.map((file) => (
            <a key={file.id} href={file.public_url} target="_blank" className="rounded-lg border border-border p-3 hover:bg-muted/40">
              <p className="font-medium text-sm break-all">{file.original_name}</p>
              <p className="text-xs text-muted-foreground">{file.section_slug || 'General'} - {(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
            </a>
          ))}
          {detail.attachments.length === 0 && <p className="text-sm text-muted-foreground">No attachments uploaded.</p>}
        </div>
      </AdminSection>
      <AdminSection title="Comments & Version History">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {detail.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-border p-3 text-sm">
                <p>{comment.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">{comment.author_type} - {new Date(comment.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {detail.versions.map((version) => (
              <div key={version.id} className="rounded-lg border border-border p-3 text-sm">
                <p>Version {version.version_number} - {version.status}</p>
                <p className="text-xs text-muted-foreground">{new Date(version.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </AdminSection>
    </div>
  );
}
