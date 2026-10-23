'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { REQUIREMENT_STATUS_LABELS, type RequirementRecord, type RequirementStatus } from '@/lib/partner/types';
import { usePartnerAccess } from '@/components/partner/PartnerShell';
import { partnerHasNavAccess } from '@/lib/partner/nav';
import { ENGAGEMENT_TYPES } from '@/lib/partner/service-catalog';
import {
  PartnerEmpty,
  PartnerPageHero,
  PartnerStatTile,
  partnerBtnPrimary,
  partnerBtnSecondary,
  partnerCard,
  partnerInput,
} from '@/components/partner/PartnerUi';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  need_clarification: 'bg-amber-100 text-amber-800',
  proposal_sent: 'bg-violet-50 text-violet-700',
  approved: 'bg-emerald-50 text-emerald-700',
  won: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-50 text-red-700',
  lost: 'bg-red-50 text-red-700',
  archived: 'bg-slate-100 text-slate-500',
};

const LIST_STATUS_LABELS: Record<string, string> = {
  ...REQUIREMENT_STATUS_LABELS,
  proposal_sent: 'Proposal Shared',
  approved: 'Approved',
};

function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function requirementTypeLabel(req: RequirementRecord): string {
  if (req.engagement_type) {
    return ENGAGEMENT_TYPES.find((item) => item.slug === req.engagement_type)?.name ?? req.engagement_type;
  }
  return req.partner_packages?.name ?? 'Standard Package';
}

function businessName(req: RequirementRecord): string {
  const fromData = req.business_data?.company_name;
  if (typeof fromData === 'string' && fromData.trim()) return fromData.trim();
  return req.project_name || 'Untitled project';
}

export default function PartnerRequirementsPage() {
  const access = usePartnerAccess();
  const canCreateRequirement = access
    ? partnerHasNavAccess(access.partnerUser, 'requirements', access.partner)
    : false;
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/partner/requirements')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRequirements(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const services = useMemo(() => {
    const names = new Set(
      requirements
        .map((req) => req.partner_service_categories?.name)
        .filter((name): name is string => Boolean(name))
    );
    return [...names];
  }, [requirements]);

  const stats = useMemo(() => {
    const total = requirements.length;
    const inReview = requirements.filter((req) => req.status === 'submitted' || req.status === 'under_review' || req.status === 'need_clarification').length;
    const proposalReceived = requirements.filter((req) => req.status === 'proposal_sent' || req.proposal_sent_at).length;
    const quotationSent = requirements.filter((req) => req.status === 'approved' || req.status === 'won').length;
    return { total, inReview, proposalReceived, quotationSent };
  }, [requirements]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = Date.now();
    const rows = requirements.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && (req.partner_service_categories?.name ?? '') !== serviceFilter) return false;
      if (dateFilter === '30' && now - new Date(req.created_at).getTime() > 30 * 24 * 60 * 60 * 1000) return false;
      if (dateFilter === '90' && now - new Date(req.created_at).getTime() > 90 * 24 * 60 * 60 * 1000) return false;
      if (!needle) return true;
      const haystack = [
        req.reference_id,
        req.project_name,
        businessName(req),
        req.partner_service_categories?.name,
        requirementTypeLabel(req),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
    rows.sort((a, b) => {
      const aTime = new Date(a.submitted_at || a.created_at).getTime();
      const bTime = new Date(b.submitted_at || b.created_at).getTime();
      return sort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
    return rows;
  }, [dateFilter, query, requirements, serviceFilter, sort, statusFilter]);

  const duplicate = async (id: string) => {
    const res = await fetch('/api/partner/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', sourceId: id }),
    });
    const data = await res.json();
    if (data.id) {
      window.location.href = `/partner/requirements/new?draft=${data.id}`;
    }
  };

  return (
    <div className="w-full space-y-5">
      <PartnerPageHero
        title="Requirements"
        description="Track submissions, receive proposals and quotations, and manage requirement status."
        action={
          canCreateRequirement ? (
            <Link href="/partner/requirements/new" className={partnerBtnPrimary}>
              <Icon name="PlusIcon" size={16} />
              Create new requirement
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <PartnerStatTile label="Total Requirements" value={stats.total} icon="DocumentTextIcon" tone="sky" href="/partner/requirements" />
        <PartnerStatTile label="In Review" value={stats.inReview} icon="ClockIcon" tone="amber" />
        <PartnerStatTile label="Proposal Received" value={stats.proposalReceived} icon="DocumentDuplicateIcon" tone="blue" />
        <PartnerStatTile label="Quotation Sent" value={stats.quotationSent} icon="EnvelopeIcon" tone="emerald" />
      </div>

      <div className={`flex flex-col gap-3 ${partnerCard} p-3 lg:flex-row lg:items-center`}>
        <div className="relative min-w-0 flex-1">
          <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by reference, project name or service…"
            className={`${partnerInput} pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={partnerInput}>
          <option value="all">All Statuses</option>
          {Object.entries(LIST_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className={partnerInput}>
          <option value="all">All Services</option>
          {services.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className={partnerInput}>
          <option value="all">All Dates</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className={partnerInput}>
          <option value="newest">Sort by Newest First</option>
          <option value="oldest">Sort by Oldest First</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <PartnerEmpty
          icon="ClipboardDocumentListIcon"
          title="No requirements found."
          action={
            canCreateRequirement ? (
              <Link href="/partner/requirements/new" className="text-sm font-semibold text-secondary hover:underline">
                Create your first requirement →
              </Link>
            ) : null
          }
        />
      ) : (
        <div className={`overflow-x-auto ${partnerCard}`}>
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Business / Project</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Requirement Type</th>
                <th className="px-4 py-3 font-medium">Submitted On</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Proposal</th>
                <th className="px-4 py-3 font-medium">Quotation</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => {
                const proposalReady = Boolean(req.proposal_sent_at);
                const quotationReady = req.status === 'approved' || req.status === 'won';
                return (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/partner/requirements/${req.id}`} className="font-mono text-xs font-semibold text-secondary hover:underline">
                        {req.reference_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{businessName(req)}</p>
                      <p className="text-xs text-slate-500">{req.project_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{req.partner_service_categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{requirementTypeLabel(req)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatShortDate(req.submitted_at || req.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[req.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {LIST_STATUS_LABELS[req.status] ?? req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {proposalReady ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <Icon name="CheckCircleIcon" size={14} />
                          Received
                          <span className="text-slate-400">{formatShortDate(req.proposal_sent_at)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Icon name="ClockIcon" size={14} />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {quotationReady ? (
                        <span className="inline-flex items-center gap-1 font-medium text-sky-700">
                          <Icon name="EnvelopeIcon" size={14} />
                          Sent
                          <span className="text-slate-400">{formatShortDate(req.updated_at)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Icon name="ClockIcon" size={14} />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/partner/requirements/${req.id}`} className="text-xs font-semibold text-secondary hover:underline">
                          View
                        </Link>
                        {canCreateRequirement && req.status === 'draft' ? (
                          <Link href={`/partner/requirements/new?draft=${req.id}`} className="text-xs text-slate-500 hover:underline">
                            Edit
                          </Link>
                        ) : null}
                        {quotationReady || proposalReady ? (
                          <a href={`/api/partner/requirements/${req.id}/export?format=pdf`} className="text-xs font-semibold text-secondary hover:underline">
                            Download Quote
                          </a>
                        ) : canCreateRequirement ? (
                          <button type="button" onClick={() => duplicate(req.id)} className="text-xs text-slate-500 hover:underline">
                            Duplicate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={`flex flex-col items-start justify-between gap-4 ${partnerCard} px-5 py-4 sm:flex-row sm:items-center`}>
        <div>
          <p className="font-medium text-slate-900">Need something custom?</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Contact us for enterprise or bespoke solutions beyond standard packages.
          </p>
        </div>
        <Link href="/partner/support" className={partnerBtnSecondary}>
          Request Custom Solution
        </Link>
      </div>

      <div className="rounded-[28px] bg-gradient-to-r from-orange-50 via-amber-50 to-rose-50 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">How it works</p>
        <h2 className="mt-1 font-bricolage text-xl font-bold text-slate-900">From Requirement to Quotation</h2>
        <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { n: '1', title: 'Submit Requirement', copy: 'Share your project details and requirements.' },
            { n: '2', title: 'Review by Our Team', copy: 'We analyze your needs and prepare a solution.' },
            { n: '3', title: 'Proposal & Timeline', copy: 'Receive a detailed proposal with timeline and cost.' },
            { n: '4', title: 'Quotation by Email', copy: 'Final quotation is sent directly to your email.' },
            { n: '5', title: 'Approval & Onboarding', copy: 'Confirm and we will get started.' },
          ].map((step) => (
            <li key={step.n} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">{step.n}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <Icon name="CheckCircleIcon" size={18} className="mt-0.5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Synced to Admin Dashboard</p>
              <p className="text-xs text-slate-500">All submissions are automatically synced with our internal system.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <Icon name="EnvelopeIcon" size={18} className="mt-0.5 text-sky-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Quotation emailed automatically</p>
              <p className="text-xs text-slate-500">You&apos;ll receive the final quotation directly in your email inbox.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
