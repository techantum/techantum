'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { REQUIREMENT_STATUS_LABELS, type RequirementRecord, type RequirementStatus } from '@/lib/partner/types';

export default function PartnerDocumentsPage() {
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);

  useEffect(() => {
    fetch('/api/partner/requirements')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRequirements(data.filter((r: RequirementRecord) => r.status !== 'draft'));
        }
      });
  }, []);

  return (
    <div>
      <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-2">Documents</h1>
      <p className="text-sm text-slate-500 mb-6">Generated Scope of Work documents from submitted requirements.</p>

      {requirements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Icon name="DocumentTextIcon" size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No documents yet. Submit a requirement to generate SOW.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map((req) => (
            <Link
              key={req.id}
              href={`/partner/requirements/${req.id}`}
              className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 transition-colors"
            >
              <div>
                <p className="font-mono text-xs text-indigo-600">{req.reference_id}</p>
                <p className="font-medium text-slate-900">{req.project_name || 'Untitled'}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {REQUIREMENT_STATUS_LABELS[req.status as RequirementStatus]} ·{' '}
                  {new Date(req.updated_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <Icon name="ArrowRightIcon" size={18} className="text-indigo-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
