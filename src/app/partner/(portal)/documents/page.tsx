'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from '@/lib/partner/types';

interface DocumentRow {
  requirementId: string;
  referenceId: string;
  projectName: string | null;
  status: string;
  version: number;
  updatedAt: string;
  pdfUrl: string | null;
  docxUrl: string | null;
  proposalSentAt: string | null;
  proposalAmount: string | null;
}

export default function PartnerDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partner/documents')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocuments(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-2">Documents</h1>
      <p className="text-sm text-slate-500 mb-6">
        Download Scope of Work and proposal documents for submitted requirements.
      </p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading documents…</p>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Icon name="DocumentTextIcon" size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No documents yet.</p>
          <p className="text-sm text-slate-500 mt-1">
            Submit a requirement to generate a Scope of Work (PDF).
          </p>
          <Link
            href="/partner/packages"
            className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Select a package & start →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Reference</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden sm:table-cell">
                  Project
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden md:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden lg:table-cell">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Download</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.requirementId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-indigo-600">{doc.referenceId}</p>
                    <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
                      {doc.projectName || 'Untitled'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-900 hidden sm:table-cell">
                    {doc.projectName || 'Untitled'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Icon name="DocumentTextIcon" size={14} className="text-indigo-400" />
                      Scope of Work
                      {doc.proposalSentAt && (
                        <span className="text-xs text-indigo-600 ml-1">+ Proposal</span>
                      )}
                    </span>
                    {doc.proposalAmount && (
                      <p className="text-xs text-slate-400 mt-0.5">{doc.proposalAmount}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {REQUIREMENT_STATUS_LABELS[doc.status as RequirementStatus] ?? doc.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      v{doc.version} · {new Date(doc.updatedAt).toLocaleDateString('en-IN')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {doc.pdfUrl ? (
                        <a
                          href={doc.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <Icon name="ArrowDownTrayIcon" size={14} />
                          PDF
                        </a>
                      ) : (
                        <Link
                          href={`/partner/requirements/${doc.requirementId}`}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          View
                        </Link>
                      )}
                      {doc.docxUrl && (
                        <a
                          href={doc.docxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          DOCX
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
