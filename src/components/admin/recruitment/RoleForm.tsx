'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import { DEFAULT_THRESHOLDS } from '@/lib/recruitment/config';
import { ROLE_TEMPLATES } from '@/lib/recruitment/templates';
import type { RecruitmentAssessmentArea, RecruitmentJobRole } from '@/lib/recruitment/types';

type AreaDraft = Omit<RecruitmentAssessmentArea, 'id' | 'job_role_id' | 'created_at' | 'updated_at'> & { id?: string };

const DEPARTMENTS = ['Sales', 'Engineering', 'Delivery', 'Marketing', 'Operations', 'Human Resources', 'Finance', 'Administration'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract'];

const emptyArea = (): AreaDraft => ({
  name: '',
  description: '',
  weightage: 20,
  rating_scale_max: 5,
  mandatory: false,
  minimum_required_score: null,
  ai_instructions: '',
  display_order: 0,
  status: 'ACTIVE',
});

function toLines(value?: string | null) {
  if (!value?.trim()) return [];
  const parts = value
    .split(/\n|•|;/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  return parts;
}

function toSkills(value?: string | null) {
  const lines = toLines(value);
  if (lines.length > 1) return lines;
  return (value || '')
    .split(/,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value: string) {
  return toLines(value).join('\n');
}

export default function RoleForm({
  mode = 'create',
  initialRole,
  initialAreas,
  onSubmit,
  saving,
  message,
  error,
  extraAction,
}: {
  mode?: 'create' | 'edit';
  initialRole?: Partial<RecruitmentJobRole>;
  initialAreas?: AreaDraft[];
  onSubmit: (role: Record<string, unknown>, areas: AreaDraft[]) => Promise<void>;
  saving: boolean;
  message?: string;
  error?: string;
  extraAction?: React.ReactNode;
}) {
  const [role, setRole] = useState({
    title: initialRole?.title || '',
    department: initialRole?.department || '',
    experience_required: initialRole?.experience_required || '',
    employment_type: initialRole?.employment_type || 'Full-time',
    work_location: initialRole?.work_location || '',
    job_description: initialRole?.job_description || '',
    key_responsibilities: joinLines(initialRole?.key_responsibilities || ''),
    required_skills: joinLines(initialRole?.required_skills || ''),
    preferred_skills: initialRole?.preferred_skills || '',
    minimum_qualification: initialRole?.minimum_qualification || '',
    minimum_screening_score: initialRole?.minimum_screening_score ?? 70,
    status: initialRole?.status || 'DRAFT',
    score_thresholds: initialRole?.score_thresholds || DEFAULT_THRESHOLDS,
  });
  const [areas, setAreas] = useState<AreaDraft[]>(initialAreas?.length ? initialAreas : [emptyArea()]);
  const [templateId, setTemplateId] = useState('');
  const [savedRoles, setSavedRoles] = useState<RecruitmentJobRole[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [customDepartment, setCustomDepartment] = useState(
    Boolean(initialRole?.department && !DEPARTMENTS.includes(initialRole.department)),
  );

  useEffect(() => {
    fetch('/api/admin/recruitment/roles', { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json();
        if (r.ok && Array.isArray(body)) setSavedRoles(body);
      })
      .catch(() => undefined);
  }, []);

  const weightSum = useMemo(
    () => areas.filter((a) => a.status !== 'INACTIVE').reduce((s, a) => s + Number(a.weightage || 0), 0),
    [areas],
  );

  const previewResponsibilities = toLines(role.key_responsibilities);
  const previewSkills = toSkills(role.required_skills);
  const updateArea = (index: number, patch: Partial<AreaDraft>) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const applyBuiltIn = (id: string) => {
    const template = ROLE_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setRole({
      title: template.role.title,
      department: template.role.department,
      experience_required: template.role.experience_required || '',
      employment_type: template.role.employment_type,
      work_location: template.role.work_location || '',
      job_description: template.role.job_description || '',
      key_responsibilities: joinLines(template.role.key_responsibilities || ''),
      required_skills: toSkills(template.role.required_skills || '').join('\n'),
      preferred_skills: template.role.preferred_skills || '',
      minimum_qualification: template.role.minimum_qualification || '',
      minimum_screening_score: template.role.minimum_screening_score,
      status: template.role.status,
      score_thresholds: template.role.score_thresholds,
    });
    setAreas(template.areas.map((a) => ({ ...a })));
    setCustomDepartment(false);
  };

  const loadTemplate = async () => {
    if (!templateId) return;
    if (templateId.startsWith('builtin:')) {
      applyBuiltIn(templateId.replace('builtin:', ''));
      return;
    }
    setLoadingTemplate(true);
    try {
      const res = await fetch(`/api/admin/recruitment/roles/${templateId}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load template');
      const next = body.role as RecruitmentJobRole;
      const nextAreas = (body.areas || []) as AreaDraft[];
      setRole({
        title: next.title,
        department: next.department,
        experience_required: next.experience_required || '',
        employment_type: next.employment_type || 'Full-time',
        work_location: next.work_location || '',
        job_description: next.job_description || '',
        key_responsibilities: joinLines(next.key_responsibilities || ''),
        required_skills: toSkills(next.required_skills || '').join('\n'),
        preferred_skills: next.preferred_skills || '',
        minimum_qualification: next.minimum_qualification || '',
        minimum_screening_score: next.minimum_screening_score ?? 70,
        status: next.status || 'DRAFT',
        score_thresholds: next.score_thresholds || DEFAULT_THRESHOLDS,
      });
      setAreas(nextAreas.length ? nextAreas : [emptyArea()]);
      setCustomDepartment(Boolean(next.department && !DEPARTMENTS.includes(next.department)));
    } finally {
      setLoadingTemplate(false);
    }
  };

  const moveArea = (from: number, to: number) => {
    if (to < 0 || to >= areas.length || from === to) return;
    setAreas((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const submit = () => {
    if (!role.title.trim() || !role.department.trim()) {
      setFormError('Job role title and department are required.');
      return;
    }
    setFormError('');
    void onSubmit(
      {
        ...role,
        key_responsibilities: toLines(role.key_responsibilities).join('\n'),
        required_skills: toSkills(role.required_skills).join(', '),
      },
      areas.map((a, i) => ({
        ...a,
        display_order: i,
        ai_instructions: a.ai_instructions || a.description,
      })),
    );
  };

  const fieldClass = `${adminInputClass} rounded-xl border-slate-200`;
  const selectClass = `${adminSelectClass} rounded-xl border-slate-200`;
  const areaClass = `${adminTextareaClass} min-h-[76px] rounded-xl border-slate-200`;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md">
            <Icon name="BriefcaseIcon" size={22} />
          </div>
          <div>
            <h1 className="font-bricolage text-2xl font-bold text-slate-900">
              {mode === 'edit' ? 'Edit Job Role' : 'Create Job Role'}
            </h1>
            <p className="text-sm text-slate-500">Define role details and AI assessment criteria (100% weightage).</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extraAction}
          <Link
            href="/admin/recruitment/roles"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Role Template'}
          </button>
        </div>
      </div>

      {message && <AdminAlert>{message}</AdminAlert>}
      {(error || formError) && <AdminAlert variant="error">{error || formError}</AdminAlert>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">1</span>
            <h2 className="font-semibold text-slate-900">Role Information</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">Job Role Title *</span>
              <input className={fieldClass} placeholder="e.g. Business Development Manager" value={role.title} onChange={(e) => setRole({ ...role, title: e.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">Department *</span>
              <select
                className={selectClass}
                value={customDepartment ? 'Other' : role.department}
                onChange={(e) => {
                  if (e.target.value === 'Other') {
                    setCustomDepartment(true);
                    setRole({ ...role, department: DEPARTMENTS.includes(role.department) ? '' : role.department });
                    return;
                  }
                  setCustomDepartment(false);
                  setRole({ ...role, department: e.target.value });
                }}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
                <option value="Other">Other</option>
              </select>
              {customDepartment && (
                <input className={fieldClass} placeholder="Enter department" value={role.department} onChange={(e) => setRole({ ...role, department: e.target.value })} />
              )}
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">Employment Type</span>
              <select className={selectClass} value={role.employment_type} onChange={(e) => setRole({ ...role, employment_type: e.target.value })}>
                {EMPLOYMENT_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">Experience Required</span>
              <input className={fieldClass} placeholder="e.g. 2–5 years" value={role.experience_required} onChange={(e) => setRole({ ...role, experience_required: e.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">Work Location</span>
              <input className={fieldClass} placeholder="e.g. Hyderabad / Remote / Hybrid" value={role.work_location} onChange={(e) => setRole({ ...role, work_location: e.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">Status</span>
              <select className={selectClass} value={role.status} onChange={(e) => setRole({ ...role, status: e.target.value as RecruitmentJobRole['status'] })}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-slate-500">Job Description</span>
              <textarea className={`${areaClass} min-h-[110px]`} placeholder="Brief about the role, responsibilities and expectations…" value={role.job_description} onChange={(e) => setRole({ ...role, job_description: e.target.value })} />
            </label>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Role Template</h2>
            <p className="mt-1 text-xs text-slate-500">Load from existing template to save time.</p>
            <select className={`${selectClass} mt-4`} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select a template</option>
              <optgroup label="Built-in templates">
                {ROLE_TEMPLATES.map((template) => (
                  <option key={template.id} value={`builtin:${template.id}`}>{template.label}</option>
                ))}
              </optgroup>
              {savedRoles.length > 0 && (
                <optgroup label="Saved roles">
                  {savedRoles
                    .filter((item) => item.id !== initialRole?.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              disabled={!templateId || loadingTemplate}
              onClick={() => void loadTemplate()}
              className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
            >
              {loadingTemplate ? 'Loading…' : 'Load Template'}
            </button>
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <p className="font-semibold">Save as Template</p>
              <p className="mt-1 text-xs leading-5">Once you create the role, you can reuse it as a template for future roles.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <Icon name="EyeIcon" size={16} className="text-violet-600" />
              <h2 className="font-semibold">Role Preview</h2>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{role.title || 'Untitled role'}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              {role.department && <span className="rounded-full bg-slate-100 px-2 py-0.5">{role.department}</span>}
              {role.work_location && <span className="rounded-full bg-slate-100 px-2 py-0.5">{role.work_location}</span>}
              {role.employment_type && <span className="rounded-full bg-slate-100 px-2 py-0.5">{role.employment_type}</span>}
              {role.experience_required && <span className="rounded-full bg-slate-100 px-2 py-0.5">{role.experience_required}</span>}
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-semibold text-slate-800">About the role</p>
                <p className="mt-1 line-clamp-4 text-slate-500">{role.job_description || 'Role description will appear here.'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Key Responsibilities</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-500">
                  {(previewResponsibilities.length ? previewResponsibilities.slice(0, 4) : ['Add responsibilities to preview them.']).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Required Skills</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(previewSkills.length ? previewSkills.slice(0, 6) : []).map((item) => (
                    <span key={item} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{item}</span>
                  ))}
                  {previewSkills.length > 6 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">+{previewSkills.length - 6}</span>
                  )}
                  {previewSkills.length === 0 && <span className="text-xs text-slate-400">Skills will appear as tags.</span>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">2</span>
          <h2 className="font-semibold text-slate-900">Key Details</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-1.5 rounded-2xl border border-slate-100 p-4">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Icon name="AcademicCapIcon" size={15} className="text-violet-600" />
              Minimum Qualification
            </span>
            <input className={fieldClass} placeholder="e.g. Any Graduate / B.Tech / MBA" value={role.minimum_qualification} onChange={(e) => setRole({ ...role, minimum_qualification: e.target.value })} />
          </label>
          <label className="space-y-1.5 rounded-2xl border border-slate-100 p-4">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Icon name="ChartBarIcon" size={15} className="text-violet-600" />
              Minimum Screening Score
            </span>
            <div className="relative">
              <input type="number" min={0} max={100} className={`${fieldClass} pr-10`} value={role.minimum_screening_score} onChange={(e) => setRole({ ...role, minimum_screening_score: Number(e.target.value) })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">%</span>
            </div>
          </label>
          <label className="space-y-1.5 rounded-2xl border border-slate-100 p-4">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Icon name="ListBulletIcon" size={15} className="text-violet-600" />
              Key Responsibilities
            </span>
            <textarea className={`${areaClass} min-h-[140px]`} placeholder="Add key responsibilities (one per line)" value={role.key_responsibilities} onChange={(e) => setRole({ ...role, key_responsibilities: e.target.value })} />
          </label>
          <label className="space-y-1.5 rounded-2xl border border-slate-100 p-4">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Icon name="Cog6ToothIcon" size={15} className="text-violet-600" />
              Required Skills
            </span>
            <textarea className={`${areaClass} min-h-[140px]`} placeholder="Add required skills (one per line)" value={role.required_skills} onChange={(e) => setRole({ ...role, required_skills: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">3</span>
            <h2 className="font-semibold text-slate-900">Assessment Criteria (100% weightage)</h2>
          </div>
          <button
            type="button"
            onClick={() => setAreas((prev) => [...prev, emptyArea()])}
            className="inline-flex items-center gap-1 rounded-xl border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            <Icon name="PlusIcon" size={14} />
            Add Criteria
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="w-10 px-2 py-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Assessment Area</th>
                <th className="px-2 py-2 font-semibold">What to Assess</th>
                <th className="w-36 px-2 py-2 font-semibold">Weightage (%)</th>
                <th className="w-16 px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area, index) => (
                <tr
                  key={area.id || index}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex != null) moveArea(dragIndex, index);
                    setDragIndex(null);
                  }}
                  className="border-t border-slate-100 align-top"
                >
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Icon name="Bars2Icon" size={14} />
                      <span className="font-semibold text-slate-600">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <input className={fieldClass} placeholder="e.g. Communication Skills" value={area.name} onChange={(e) => updateArea(index, { name: e.target.value })} />
                  </td>
                  <td className="px-2 py-3">
                    <textarea className={`${areaClass} min-h-[72px]`} placeholder="What the AI should look for" value={area.description} onChange={(e) => updateArea(index, { description: e.target.value })} />
                  </td>
                  <td className="px-2 py-3">
                    <div className="relative">
                      <input type="number" min={0} max={100} className={`${fieldClass} pr-8`} value={area.weightage} onChange={(e) => updateArea(index, { weightage: Number(e.target.value) })} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      disabled={areas.length === 1}
                      onClick={() => setAreas((prev) => prev.filter((_, i) => i !== index))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                      aria-label="Remove criteria"
                    >
                      <Icon name="TrashIcon" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`mt-4 flex justify-end text-sm font-semibold ${Math.abs(weightSum - 100) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
          Total {weightSum}%
        </div>
      </section>
    </div>
  );
}
