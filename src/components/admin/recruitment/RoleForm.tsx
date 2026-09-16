'use client';

import { useMemo, useState } from 'react';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminButton from '@/components/admin/AdminButton';
import { DEFAULT_THRESHOLDS } from '@/lib/recruitment/config';
import { ROLE_TEMPLATES } from '@/lib/recruitment/templates';
import type { RecruitmentAssessmentArea, RecruitmentJobRole } from '@/lib/recruitment/types';

type AreaDraft = Omit<RecruitmentAssessmentArea, 'id' | 'job_role_id' | 'created_at' | 'updated_at'> & { id?: string };

const emptyArea = (): AreaDraft => ({
  name: '',
  description: '',
  weightage: 10,
  rating_scale_max: 5,
  mandatory: false,
  minimum_required_score: null,
  ai_instructions: '',
  display_order: 0,
  status: 'ACTIVE',
});

export default function RoleForm({
  initialRole,
  initialAreas,
  onSubmit,
  saving,
}: {
  initialRole?: Partial<RecruitmentJobRole>;
  initialAreas?: AreaDraft[];
  onSubmit: (role: Record<string, unknown>, areas: AreaDraft[]) => Promise<void>;
  saving: boolean;
}) {
  const [role, setRole] = useState({
    title: initialRole?.title || '',
    department: initialRole?.department || '',
    experience_required: initialRole?.experience_required || '',
    employment_type: initialRole?.employment_type || 'Full-time',
    work_location: initialRole?.work_location || '',
    job_description: initialRole?.job_description || '',
    key_responsibilities: initialRole?.key_responsibilities || '',
    required_skills: initialRole?.required_skills || '',
    preferred_skills: initialRole?.preferred_skills || '',
    minimum_qualification: initialRole?.minimum_qualification || '',
    minimum_screening_score: initialRole?.minimum_screening_score ?? 70,
    status: initialRole?.status || 'DRAFT',
    score_thresholds: initialRole?.score_thresholds || DEFAULT_THRESHOLDS,
  });
  const [areas, setAreas] = useState<AreaDraft[]>(initialAreas?.length ? initialAreas : [emptyArea()]);

  const weightSum = useMemo(
    () => areas.filter((a) => a.status !== 'INACTIVE').reduce((s, a) => s + Number(a.weightage || 0), 0),
    [areas],
  );

  const updateArea = (index: number, patch: Partial<AreaDraft>) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const applyTemplate = (templateId: string) => {
    const template = ROLE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setRole({
      title: template.role.title,
      department: template.role.department,
      experience_required: template.role.experience_required || '',
      employment_type: template.role.employment_type,
      work_location: template.role.work_location || '',
      job_description: template.role.job_description || '',
      key_responsibilities: template.role.key_responsibilities || '',
      required_skills: template.role.required_skills || '',
      preferred_skills: template.role.preferred_skills || '',
      minimum_qualification: template.role.minimum_qualification || '',
      minimum_screening_score: template.role.minimum_screening_score,
      status: template.role.status,
      score_thresholds: template.role.score_thresholds,
    });
    setAreas(template.areas.map((a) => ({ ...a })));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(role, areas.map((a, i) => ({ ...a, display_order: i })));
      }}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
        <p className="text-xs font-medium text-muted-foreground mr-1">Load template:</p>
        {ROLE_TEMPLATES.map((template) => (
          <AdminButton key={template.id} type="button" size="sm" onClick={() => applyTemplate(template.id)}>
            {template.label}
          </AdminButton>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AdminField label="Job role title *">
          <input className={adminInputClass} value={role.title} onChange={(e) => setRole({ ...role, title: e.target.value })} required />
        </AdminField>
        <AdminField label="Department *">
          <input className={adminInputClass} value={role.department} onChange={(e) => setRole({ ...role, department: e.target.value })} required />
        </AdminField>
        <AdminField label="Experience required">
          <input className={adminInputClass} value={role.experience_required} onChange={(e) => setRole({ ...role, experience_required: e.target.value })} />
        </AdminField>
        <AdminField label="Employment type">
          <select className={adminSelectClass} value={role.employment_type} onChange={(e) => setRole({ ...role, employment_type: e.target.value })}>
            <option>Full-time</option>
            <option>Internship</option>
            <option>Contract</option>
          </select>
        </AdminField>
        <AdminField label="Work location">
          <input className={adminInputClass} value={role.work_location} onChange={(e) => setRole({ ...role, work_location: e.target.value })} />
        </AdminField>
        <AdminField label="Minimum screening score (%)">
          <input type="number" className={adminInputClass} value={role.minimum_screening_score} onChange={(e) => setRole({ ...role, minimum_screening_score: Number(e.target.value) })} />
        </AdminField>
        <AdminField label="Status">
          <select className={adminSelectClass} value={role.status} onChange={(e) => setRole({ ...role, status: e.target.value as RecruitmentJobRole['status'] })}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </AdminField>
        <AdminField label="Minimum qualification">
          <input className={adminInputClass} value={role.minimum_qualification} onChange={(e) => setRole({ ...role, minimum_qualification: e.target.value })} />
        </AdminField>
        <AdminField label="Job description" span={2}>
          <textarea className={adminTextareaClass} rows={3} value={role.job_description} onChange={(e) => setRole({ ...role, job_description: e.target.value })} />
        </AdminField>
        <AdminField label="Key responsibilities" span={2}>
          <textarea className={adminTextareaClass} rows={3} value={role.key_responsibilities} onChange={(e) => setRole({ ...role, key_responsibilities: e.target.value })} />
        </AdminField>
        <AdminField label="Required skills" span={2}>
          <textarea className={adminTextareaClass} rows={2} value={role.required_skills} onChange={(e) => setRole({ ...role, required_skills: e.target.value })} />
        </AdminField>
        <AdminField label="Preferred skills" span={2}>
          <textarea className={adminTextareaClass} rows={2} value={role.preferred_skills} onChange={(e) => setRole({ ...role, preferred_skills: e.target.value })} />
        </AdminField>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Assessment areas</h3>
          <p className={`text-xs ${Math.abs(weightSum - 100) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}>Total weight: {weightSum}%</p>
        </div>
        {areas.map((area, index) => (
          <div key={index} className="rounded-md border border-border/80 p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-muted/20">
            <AdminField label="Assessment area">
              <input className={adminInputClass} value={area.name} onChange={(e) => updateArea(index, { name: e.target.value })} />
            </AdminField>
            <AdminField label="Weightage (%)">
              <input type="number" className={adminInputClass} value={area.weightage} onChange={(e) => updateArea(index, { weightage: Number(e.target.value) })} />
            </AdminField>
            <AdminField label="What to assess" span={2}>
              <textarea className={adminTextareaClass} rows={2} value={area.description} onChange={(e) => updateArea(index, { description: e.target.value })} />
            </AdminField>
            <AdminField label="AI instructions">
              <input className={adminInputClass} value={area.ai_instructions || ''} onChange={(e) => updateArea(index, { ai_instructions: e.target.value })} />
            </AdminField>
            <label className="flex items-center gap-2 text-sm self-end">
              <input type="checkbox" checked={area.mandatory} onChange={(e) => updateArea(index, { mandatory: e.target.checked })} />
              Mandatory
            </label>
            {areas.length > 1 && (
              <AdminButton type="button" size="sm" onClick={() => setAreas((prev) => prev.filter((_, i) => i !== index))}>
                Remove
              </AdminButton>
            )}
          </div>
        ))}
        <AdminButton type="button" onClick={() => setAreas((prev) => [...prev, emptyArea()])}>+ Add assessment area</AdminButton>
      </div>

      <AdminButton type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save role template'}</AdminButton>
    </form>
  );
}
