'use client';

import Link from 'next/link';
import AdminBadge from '@/components/admin/AdminBadge';
import { ROLE_STATUS_LABELS } from '@/lib/recruitment/config';

export type RolePipelineStats = {
  id: string;
  title: string;
  department: string;
  status: string;
  experience_required?: string | null;
  employment_type?: string | null;
  work_location?: string | null;
  candidates_total: number;
  shortlisted: number;
  interviews?: number;
  interviewed?: number;
  selected: number;
};

const STATS = [
  { key: 'candidates_total' as const, label: 'Candidates', accent: 'text-slate-900 bg-slate-50 border-slate-100' },
  { key: 'shortlisted' as const, label: 'Shortlisted', accent: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  { key: 'interviewed' as const, label: 'Interviewed', accent: 'text-sky-700 bg-sky-50 border-sky-100' },
  { key: 'selected' as const, label: 'Selected', accent: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
];

function roleStatusVariant(status: string) {
  if (status === 'ACTIVE') return 'green' as const;
  if (status === 'DRAFT') return 'amber' as const;
  return 'default' as const;
}

export default function RolePipelineCard({ role }: { role: RolePipelineStats }) {
  const interviewed = role.interviewed ?? role.interviews ?? 0;
  const values = {
    candidates_total: role.candidates_total,
    shortlisted: role.shortlisted,
    interviewed,
    selected: role.selected,
  };

  return (
    <article className="group rounded-3xl border border-white/80 bg-white/90 shadow-lg shadow-slate-900/5 overflow-hidden hover:-translate-y-0.5 hover:shadow-xl transition-all">
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
      <div className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/admin/recruitment/roles/${role.id}/candidates`}
              className="font-bricolage text-lg font-semibold text-slate-900 hover:text-indigo-700"
            >
              {role.title}
            </Link>
            <p className="text-sm text-slate-500 mt-1">
              {role.department}
              {role.experience_required ? ` · ${role.experience_required}` : ''}
              {role.work_location ? ` · ${role.work_location}` : ''}
            </p>
          </div>
          <AdminBadge variant={roleStatusVariant(role.status)}>{ROLE_STATUS_LABELS[role.status] || role.status}</AdminBadge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATS.map((stat) => (
            <div key={stat.key} className={`rounded-2xl border px-3 py-2.5 text-center ${stat.accent}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{stat.label}</p>
              <p className="text-xl font-bold mt-0.5">{values[stat.key]}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Link
            href={`/admin/recruitment/roles/${role.id}/candidates`}
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            View candidates →
          </Link>
          <Link href={`/admin/recruitment/roles/${role.id}`} className="text-sm text-slate-500 hover:text-indigo-600">
            Edit role
          </Link>
        </div>
      </div>
    </article>
  );
}
