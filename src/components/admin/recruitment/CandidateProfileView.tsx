'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import {
  CANDIDATE_STATUS_LABELS,
  PROFILE_DECISION_ACTIONS,
  candidateInitials,
  overallFitCaption,
  overallFitLabel,
} from '@/lib/recruitment/config';
import type { AreaAssessmentResult, RecruitmentCandidate } from '@/lib/recruitment/types';

type HistoryRow = { new_status: string; created_at: string; comments: string | null };

const DECISION_STYLES: Record<string, { wrap: string; icon: string; iconName: string }> = {
  emerald: { wrap: 'border-emerald-200 text-emerald-800 hover:bg-emerald-50', icon: 'bg-emerald-500', iconName: 'CheckIcon' },
  sky: { wrap: 'border-sky-200 text-sky-800 hover:bg-sky-50', icon: 'bg-sky-500', iconName: 'ChatBubbleLeftRightIcon' },
  amber: { wrap: 'border-amber-200 text-amber-800 hover:bg-amber-50', icon: 'bg-amber-500', iconName: 'PauseIcon' },
  rose: { wrap: 'border-rose-200 text-rose-800 hover:bg-rose-50', icon: 'bg-rose-500', iconName: 'XMarkIcon' },
};

function FitRing({ percent }: { percent: number | null }) {
  const value = percent ?? 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(value, 100)) / 100) * circumference;

  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#eef2ff" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
        {percent != null ? `${percent}%` : '—'}
      </span>
    </div>
  );
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-violet-500' : 'bg-violet-300';
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-12 text-right">
        {value}/{max}
      </span>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>{children}</section>;
}

export default function CandidateProfileView({
  candidate,
  areaResults,
  history,
  hrComments,
  onHrCommentsChange,
  working,
  message,
  error,
  onSaveComments,
  onStatus,
  onReassess,
  onDelete,
  onSaveProfile,
}: {
  candidate: RecruitmentCandidate;
  areaResults: AreaAssessmentResult[];
  history: HistoryRow[];
  hrComments: string;
  onHrCommentsChange: (value: string) => void;
  working: boolean;
  message: string;
  error: string;
  onSaveComments: () => void;
  onStatus: (status: string, comment: string) => void;
  onReassess: () => void;
  onDelete: () => void;
  onSaveProfile: (payload: Record<string, unknown>) => void;
}) {
  const role = candidate.recruitment_job_roles;
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [draft, setDraft] = useState({
    name: candidate.name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    location: candidate.location || '',
    current_company: candidate.current_company || '',
    current_job_title: candidate.current_job_title || '',
    total_experience: candidate.total_experience || '',
    relevant_experience: candidate.relevant_experience || '',
    manual_screening_score: candidate.manual_screening_score != null ? String(candidate.manual_screening_score) : '',
    final_score: candidate.final_score != null ? String(candidate.final_score) : '',
  });

  useEffect(() => {
    setDraft({
      name: candidate.name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      location: candidate.location || '',
      current_company: candidate.current_company || '',
      current_job_title: candidate.current_job_title || '',
      total_experience: candidate.total_experience || '',
      relevant_experience: candidate.relevant_experience || '',
      manual_screening_score: candidate.manual_screening_score != null ? String(candidate.manual_screening_score) : '',
      final_score: candidate.final_score != null ? String(candidate.final_score) : '',
    });
  }, [candidate]);

  const questions = candidate.screening_questions || [];
  const visibleQuestions = showAllQuestions ? questions : questions.slice(0, 6);
  const assessed = candidate.overall_fit_percent != null || candidate.status === 'AI_ASSESSED';
  const displayScore = candidate.final_score ?? candidate.overall_fit_percent;

  const meta = useMemo(
    () =>
      [
        { icon: 'EnvelopeIcon', value: candidate.email },
        { icon: 'PhoneIcon', value: candidate.phone },
        { icon: 'BuildingOffice2Icon', value: candidate.current_company },
        { icon: 'ClockIcon', value: candidate.total_experience },
      ].filter((item) => item.value),
    [candidate.email, candidate.phone, candidate.current_company, candidate.total_experience],
  );

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <nav className="flex flex-wrap items-center gap-1.5">
          <Link href="/admin/recruitment" className="hover:text-indigo-600">
            Recruitment
          </Link>
          <span>/</span>
          {role ? (
            <Link href={`/admin/recruitment/roles/${candidate.job_role_id}/candidates`} className="hover:text-indigo-600">
              Candidates
            </Link>
          ) : (
            <span>Candidates</span>
          )}
          <span>/</span>
          <span className="text-slate-800 font-medium">{candidate.name || 'Candidate'}</span>
        </nav>
      </div>

      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-16 w-16 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-bold shrink-0">
              {candidateInitials(candidate.name)}
            </div>
            <div className="min-w-0">
              <h1 className="font-bricolage text-2xl font-bold text-slate-900">{candidate.name || 'Unnamed candidate'}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {[candidate.current_job_title || role?.title, role?.department].filter(Boolean).join(' – ') || 'Assessment detail'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                {meta.map((item) => (
                  <span key={item.icon} className="inline-flex items-center gap-1.5">
                    <Icon name={item.icon} size={15} className="text-slate-400" />
                    {item.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 relative">
            {assessed && (
              <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                AI Assessed
              </span>
            )}
            <AdminButton onClick={onReassess} disabled={working}>
              Re-run AI
            </AdminButton>
            <AdminButton variant="primary" onClick={() => setEditing(true)}>
              Edit Profile
            </AdminButton>
            <button
              type="button"
              className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="More actions"
            >
              <Icon name="EllipsisVerticalIcon" size={18} className="mx-auto" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setShowHistory(true);
                    setMenuOpen(false);
                  }}
                >
                  Status history
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  Delete profile
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="p-5 xl:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:divide-x sm:divide-slate-100">
            <div className="sm:pr-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Fit</p>
              <div className="mt-3 flex items-center gap-3">
                <FitRing percent={candidate.overall_fit_percent} />
                <div>
                  <p className="text-base font-semibold text-slate-900">{overallFitLabel(candidate.overall_fit_percent)}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{overallFitCaption(candidate.overall_fit_percent)}</p>
                </div>
              </div>
            </div>
            <div className="sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Classification</p>
              <p className="mt-6 text-xl font-semibold text-slate-900">{candidate.ai_classification || 'Pending'}</p>
            </div>
            <div className="sm:pl-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Final Score</p>
                <Icon name="TrophyIcon" size={16} className="text-violet-400" />
              </div>
              <p className="mt-6 text-3xl font-bold text-slate-900">
                {displayScore != null ? `${displayScore}` : '—'}
                <span className="text-base font-semibold text-slate-400"> / 100</span>
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recommendation</p>
            <Icon name="StarIcon" size={16} className="text-violet-400" />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-900">{candidate.ai_recommendation || 'Awaiting assessment'}</p>
          {candidate.fit_summary && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-4">{candidate.fit_summary}</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="UserIcon" size={16} className="text-violet-500" />
            <h2 className="font-semibold text-slate-900">Candidate Summary</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {candidate.fit_summary || 'No AI summary yet. Upload a resume and run assessment.'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icon name="BriefcaseIcon" size={13} /> Experience
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{candidate.total_experience || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icon name="IdentificationIcon" size={13} /> Role
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{candidate.current_job_title || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icon name="BuildingOffice2Icon" size={13} /> Current Company
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{candidate.current_company || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icon name="ClockIcon" size={13} /> Relevant Experience
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{candidate.relevant_experience || '—'}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Icon name="DocumentTextIcon" size={16} className="text-violet-500" />
                <h2 className="font-semibold text-slate-900">Resume</h2>
              </div>
              {candidate.resume_url && (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
                >
                  <Icon name="EyeIcon" size={15} />
                  View Resume
                </a>
              )}
            </div>
            {candidate.resume_url ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-[11px] font-bold">
                  PDF
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{candidate.resume_file_name || 'Resume.pdf'}</p>
                  <p className="text-xs text-slate-500">Uploaded resume</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No resume uploaded.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Icon name="ChatBubbleBottomCenterTextIcon" size={16} className="text-violet-500" />
                <h2 className="font-semibold text-slate-900">HR Review</h2>
              </div>
              <AdminButton size="sm" onClick={onSaveComments} disabled={working}>
                Add Comments
              </AdminButton>
            </div>
            <textarea
              className={adminTextareaClass}
              rows={4}
              placeholder="Add your notes about this candidate…"
              value={hrComments}
              onChange={(e) => onHrCommentsChange(e.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {PROFILE_DECISION_ACTIONS.map((action) => {
                const style = DECISION_STYLES[action.tone];
                const active = candidate.status === action.status;
                return (
                  <button
                    key={action.status}
                    type="button"
                    disabled={working}
                    onClick={() => onStatus(action.status, `Marked ${action.label}`)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${style.wrap} ${
                      active ? 'ring-2 ring-offset-1 ring-slate-200' : ''
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-full text-white flex items-center justify-center ${style.icon}`}>
                      <Icon name={style.iconName} size={13} />
                    </span>
                    {action.label}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Icon name="ChartBarIcon" size={16} className="text-violet-500" />
          <h2 className="font-semibold text-slate-900">Assessment Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">Assessment Area</th>
                <th className="px-5 py-3 font-semibold w-[240px]">Score</th>
                <th className="px-5 py-3 font-semibold">Key Findings</th>
              </tr>
            </thead>
            <tbody>
              {areaResults.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                    No assessment breakdown yet.
                  </td>
                </tr>
              )}
              {areaResults.map((row) => (
                <tr key={row.assessment_area_id} className="border-t border-slate-100 align-top">
                  <td className="px-5 py-3 font-medium text-slate-800">{row.area_name}</td>
                  <td className="px-5 py-3">
                    <ScoreBar value={row.rating} max={row.rating_max} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.assessment || row.evidence || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-5 bg-emerald-50/40 border-emerald-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Icon name="CheckIcon" size={14} />
            </span>
            <h2 className="font-semibold text-slate-900">Strengths</h2>
          </div>
          <ul className="space-y-2">
            {(candidate.strengths || []).length === 0 && <li className="text-sm text-slate-500">No strengths captured yet.</li>}
            {(candidate.strengths || []).map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                <Icon name="CheckCircleIcon" size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 bg-rose-50/40 border-rose-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
              <Icon name="ExclamationTriangleIcon" size={14} />
            </span>
            <h2 className="font-semibold text-slate-900">Gaps / Risks</h2>
          </div>
          <ul className="space-y-2">
            {(candidate.gaps || []).length === 0 && <li className="text-sm text-slate-500">No gaps captured yet.</li>}
            {(candidate.gaps || []).map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                <Icon name="XCircleIcon" size={16} className="text-rose-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Icon name="ChatBubbleLeftRightIcon" size={16} className="text-violet-500" />
            <h2 className="font-semibold text-slate-900">Suggested Interview Questions</h2>
          </div>
          {questions.length > 6 && (
            <button
              type="button"
              className="text-sm font-semibold text-indigo-600 hover:underline"
              onClick={() => setShowAllQuestions((open) => !open)}
            >
              {showAllQuestions ? 'Show fewer' : 'View All Questions'}
            </button>
          )}
        </div>
        {questions.length === 0 ? (
          <p className="text-sm text-slate-500">No suggested questions yet.</p>
        ) : (
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {visibleQuestions.map((question, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </span>
                {question}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {showHistory && history.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Status history</h2>
          <ul className="text-sm space-y-1.5 text-slate-600">
            {history.map((row, index) => (
              <li key={index}>
                {new Date(row.created_at).toLocaleString()} — {CANDIDATE_STATUS_LABELS[row.new_status] || row.new_status}
                {row.comments ? ` · ${row.comments}` : ''}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bricolage text-lg font-semibold">Edit profile</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-700">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ['name', 'Name'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['location', 'Location'],
                  ['current_company', 'Current company'],
                  ['current_job_title', 'Current role'],
                  ['total_experience', 'Experience'],
                  ['relevant_experience', 'Relevant experience'],
                  ['manual_screening_score', 'Manual score'],
                  ['final_score', 'Final score'],
                ] as const
              ).map(([key, label]) => (
                <AdminField key={key} label={label}>
                  <input
                    className={adminInputClass}
                    value={draft[key]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </AdminField>
              ))}
              <AdminField label="Status" className="sm:col-span-2">
                <select className={adminSelectClass} value={candidate.status} onChange={(e) => onStatus(e.target.value, 'Status updated')}>
                  {Object.entries(CANDIDATE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
            <div className="flex justify-end gap-2">
              <AdminButton onClick={() => setEditing(false)}>Cancel</AdminButton>
              <AdminButton
                variant="primary"
                disabled={working}
                onClick={() => {
                  onSaveProfile({
                    name: draft.name,
                    email: draft.email,
                    phone: draft.phone,
                    location: draft.location,
                    current_company: draft.current_company,
                    current_job_title: draft.current_job_title,
                    total_experience: draft.total_experience,
                    relevant_experience: draft.relevant_experience,
                    manual_screening_score: draft.manual_screening_score ? Number(draft.manual_screening_score) : null,
                    final_score: draft.final_score ? Number(draft.final_score) : null,
                  });
                  setEditing(false);
                }}
              >
                Save profile
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
