'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from '@/lib/partner/types';
import { PartnerEmpty, PartnerPageHero, partnerBtnPrimary, partnerBtnSecondary, partnerCard } from '@/components/partner/PartnerUi';

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
    <div className="w-full space-y-5">
      <PartnerPageHero
        title="Documents"
        description="Download Scope of Work and proposal documents for submitted requirements."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading documents…</p>
      ) : documents.length === 0 ? (
        <PartnerEmpty
          icon="DocumentTextIcon"
          title="No documents yet."
          description="Submit a requirement to generate a Scope of Work (PDF)."
          action={
            <Link href="/partner/requirements/new" className="text-sm font-semibold text-secondary hover:underline">
              Create a requirement →
            </Link>
          }
        />
      ) : (
        <div className={`overflow-hidden ${partnerCard}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="px-5 py-2 font-medium">Reference</th>
                <th className="hidden px-5 py-2 font-medium sm:table-cell">Project</th>
                <th className="hidden px-5 py-2 font-medium md:table-cell">Type</th>
                <th className="hidden px-5 py-2 font-medium lg:table-cell">Status</th>
                <th className="px-5 py-2 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.requirementId} className="border-t border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs text-secondary">{doc.referenceId}</p>
                    <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
                      {doc.projectName || 'Untitled'}
                    </p>
                  </td>
                  <td className="hidden px-5 py-3 font-medium text-slate-800 sm:table-cell">
                    {doc.projectName || 'Untitled'}
                  </td>
                  <td className="hidden px-5 py-3 md:table-cell">
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Icon name="DocumentTextIcon" size={14} className="text-slate-400" />
                      Scope of Work
                      {doc.proposalSentAt && (
                        <span className="text-xs text-secondary ml-1">+ Proposal</span>
                      )}
                    </span>
                    {doc.proposalAmount && (
                      <p className="text-xs text-slate-400 mt-0.5">{doc.proposalAmount}</p>
                    )}
                  </td>
                  <td className="hidden px-5 py-3 lg:table-cell">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-secondary">
                      {REQUIREMENT_STATUS_LABELS[doc.status as RequirementStatus] ?? doc.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      v{doc.version} · {new Date(doc.updatedAt).toLocaleDateString('en-IN')}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {doc.pdfUrl ? (
                        <a
                          href={doc.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${partnerBtnPrimary} px-3 py-1.5 text-xs`}
                        >
                          <Icon name="ArrowDownTrayIcon" size={14} />
                          PDF
                        </a>
                      ) : (
                        <Link
                          href={`/partner/requirements/${doc.requirementId}`}
                          className="text-xs font-semibold text-secondary hover:underline"
                        >
                          View
                        </Link>
                      )}
                      {doc.docxUrl && (
                        <a
                          href={doc.docxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${partnerBtnSecondary} px-3 py-1.5 text-xs`}
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
