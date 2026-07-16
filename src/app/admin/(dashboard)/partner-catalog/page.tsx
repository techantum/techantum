'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminTabs from '@/components/admin/AdminTabs';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import Icon from '@/components/ui/AppIcon';
import type { CategoryWithPackages, PartnerPackage, PartnerQuestion, QuestionType } from '@/lib/partner/catalog';
import { WIZARD_STEPS } from '@/lib/partner/catalog';

interface AdminCatalog {
  catalog: CategoryWithPackages[];
  templates: {
    id: string;
    slug: string;
    name: string;
    service_type: string;
    questions: PartnerQuestion[];
  }[];
}

const QUESTION_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'dropdown',
  'radio',
  'checkbox',
  'multi_select',
] as const;

const STEP_STYLES = [
  { badge: 'bg-sky-100 text-sky-700', accent: 'sky' as const },
  { badge: 'bg-violet-100 text-violet-700', accent: 'violet' as const },
  { badge: 'bg-emerald-100 text-emerald-700', accent: 'emerald' as const },
  { badge: 'bg-amber-100 text-amber-700', accent: 'amber' as const },
];

export default function PartnerCatalogAdminPage() {
  const [data, setData] = useState<AdminCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('packages');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [messageVariant, setMessageVariant] = useState<'success' | 'error' | 'info'>('success');
  const [saving, setSaving] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionKey: '',
    label: '',
    questionType: 'text',
    wizardStep: 4,
    isRequired: false,
    placeholder: '',
    helpText: '',
    group: 'General',
    options: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/partner-catalog')
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setActiveCategoryId((prev) => prev || res.catalog?.[0]?.id || '');
        setActiveTemplateId((prev) => prev || res.templates?.[0]?.id || '');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const notify = (text: string, variant: 'success' | 'error' | 'info' = 'success') => {
    setMessage(text);
    setMessageVariant(variant);
  };

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/partner-catalog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      notify(result.error || 'Save failed', 'error');
      return;
    }
    setData(result);
    notify('Saved successfully.');
  };

  const syncWizardQuestions = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/partner-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync-wizard-questions' }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      notify(result.error || 'Sync failed', 'error');
      return;
    }
    const { sync, ...catalog } = result;
    setData(catalog);
    notify(`Wizard questions synced — ${sync.updated} updated, ${sync.created} new questions added.`, 'info');
  };

  const createQuestion = async () => {
    if (!activeTemplateId) return;
    setSaving(true);
    const res = await fetch('/api/admin/partner-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'question',
        data: {
          templateId: activeTemplateId,
          questionKey: newQuestion.questionKey,
          label: newQuestion.label,
          questionType: newQuestion.questionType,
          wizardStep: newQuestion.wizardStep,
          isRequired: newQuestion.isRequired,
          placeholder: newQuestion.placeholder || undefined,
          helpText: newQuestion.helpText || undefined,
          options: newQuestion.options
            ? newQuestion.options.split('\n').map((o) => o.trim()).filter(Boolean)
            : [],
          validationRules: { group: newQuestion.group || 'General' },
        },
      }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      notify(result.error || 'Failed to add question', 'error');
      return;
    }
    setData(result);
    setShowQuestionForm(false);
    setNewQuestion({
      questionKey: '',
      label: '',
      questionType: 'text',
      wizardStep: 4,
      isRequired: false,
      placeholder: '',
      helpText: '',
      group: 'General',
      options: '',
    });
    notify('Question added.');
  };

  const removeQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    setSaving(true);
    const res = await fetch(`/api/admin/partner-catalog?entity=question&id=${questionId}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      notify(result.error || 'Delete failed', 'error');
      return;
    }
    setData(result);
    notify('Question deleted.');
  };

  const activeCategory = data?.catalog.find((c) => c.id === activeCategoryId);
  const activeTemplate = data?.templates.find((t) => t.id === activeTemplateId);

  const questionsByStep = useMemo(() => {
    if (!activeTemplate) return new Map<number, PartnerQuestion[]>();
    const map = new Map<number, PartnerQuestion[]>();
    for (const q of [...activeTemplate.questions].sort((a, b) => a.display_order - b.display_order)) {
      const step = q.wizard_step;
      if (!map.has(step)) map.set(step, []);
      map.get(step)!.push(q);
    }
    return map;
  }, [activeTemplate]);

  const featureRows = (() => {
    if (!activeCategory) return [];
    const map = new Map<string, { key: string; label: string; values: Record<string, string> }>();
    for (const pkg of activeCategory.partner_packages) {
      for (const f of pkg.partner_package_features ?? []) {
        if (!map.has(f.feature_key)) {
          map.set(f.feature_key, { key: f.feature_key, label: f.feature_label, values: {} });
        }
        map.get(f.feature_key)!.values[pkg.id] = f.value;
      }
    }
    return [...map.values()];
  })();

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
        Loading catalog…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <AdminPageHeader
        title="Partner Service Catalog"
        description="Manage service packages, comparison features, and discovery wizard questions for the Partner Portal."
        action={
          tab === 'questions' ? (
            <AdminButton variant="success" onClick={syncWizardQuestions} disabled={saving}>
              <Icon name="ArrowPathIcon" size={16} className={saving ? 'animate-spin' : ''} />
              Sync All Wizard Questions
            </AdminButton>
          ) : undefined
        }
      />

      {message && <AdminAlert variant={messageVariant}>{message}</AdminAlert>}

      <AdminTabs
        tabs={[
          { id: 'packages', label: 'Packages & Features' },
          { id: 'questions', label: 'Wizard Questions' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'packages' && data && (
        <>
          <div className="flex flex-wrap gap-2">
            {data.catalog.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategoryId === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white border border-border text-muted-foreground hover:border-indigo-200 hover:text-indigo-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {activeCategory && (
            <>
              <AdminSection
                title="Service Packages"
                description={activeCategory.description ?? 'Edit package names, taglines, and highlights.'}
                accent="violet"
              >
                <div className="space-y-4">
                  {activeCategory.partner_packages.map((pkg) => (
                    <PackageEditor
                      key={pkg.id}
                      pkg={pkg}
                      saving={saving}
                      onSave={(fields) => patch({ entity: 'package', id: pkg.id, data: fields })}
                    />
                  ))}
                </div>
              </AdminSection>

              {featureRows.length > 0 && (
                <AdminSection title="Package Comparison Matrix" accent="sky">
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Feature</th>
                          {activeCategory.partner_packages.map((p) => (
                            <th key={p.id} className="px-4 py-3 font-medium">{p.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {featureRows.map((row) => (
                          <tr key={row.key} className="border-t border-border/60 hover:bg-indigo-50/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                            {activeCategory.partner_packages.map((pkg) => (
                              <td key={pkg.id} className="px-4 py-3">
                                <input
                                  defaultValue={row.values[pkg.id] ?? '—'}
                                  onBlur={(e) =>
                                    patch({
                                      entity: 'feature',
                                      data: {
                                        packageId: pkg.id,
                                        featureKey: row.key,
                                        featureLabel: row.label,
                                        value: e.target.value,
                                      },
                                    })
                                  }
                                  className={`${adminInputClass} min-w-[80px] text-xs py-1.5`}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AdminSection>
              )}
            </>
          )}
        </>
      )}

      {tab === 'questions' && data && (
        <>
          <div className="flex flex-wrap gap-2">
            {data.templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTemplateId(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTemplateId === t.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'bg-white border border-border text-muted-foreground hover:border-violet-200 hover:text-violet-700'
                }`}
              >
                {t.name}
                <span className="ml-2 opacity-70">({t.questions.length})</span>
              </button>
            ))}
          </div>

          {activeTemplate && (
            <AdminSection
              title="Discovery Wizard Questions"
              description={`${activeTemplate.questions.length} questions across steps 1–4 for ${activeTemplate.service_type}`}
              accent="indigo"
              action={
                <AdminButton size="sm" onClick={() => setShowQuestionForm((v) => !v)}>
                  <Icon name="PlusIcon" size={14} />
                  Add Question
                </AdminButton>
              }
            >
              {showQuestionForm && (
                <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-5 space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Icon name="PlusCircleIcon" size={18} className="text-indigo-600" />
                    New Question
                  </h3>
                  <AdminFormGrid cols={3}>
                    <AdminField label="Question Key" hint="Unique snake_case identifier">
                      <input
                        value={newQuestion.questionKey}
                        onChange={(e) => setNewQuestion({ ...newQuestion, questionKey: e.target.value })}
                        placeholder="e.g. need_payment"
                        className={`${adminInputClass} font-mono`}
                      />
                    </AdminField>
                    <AdminField label="Label" span={2}>
                      <input
                        value={newQuestion.label}
                        onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })}
                        placeholder="Question shown to partners"
                        className={adminInputClass}
                      />
                    </AdminField>
                    <AdminField label="Type">
                      <select
                        value={newQuestion.questionType}
                        onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                        className={adminSelectClass}
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t} value={t}>{t.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Wizard Step">
                      <select
                        value={newQuestion.wizardStep}
                        onChange={(e) => setNewQuestion({ ...newQuestion, wizardStep: Number(e.target.value) })}
                        className={adminSelectClass}
                      >
                        {WIZARD_STEPS.filter((s) => s.step <= 4).map((s) => (
                          <option key={s.step} value={s.step}>Step {s.step}: {s.label}</option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Group">
                      <input
                        value={newQuestion.group}
                        onChange={(e) => setNewQuestion({ ...newQuestion, group: e.target.value })}
                        placeholder="e.g. Integrations"
                        className={adminInputClass}
                      />
                    </AdminField>
                    <AdminField label="Placeholder" span={2}>
                      <input
                        value={newQuestion.placeholder}
                        onChange={(e) => setNewQuestion({ ...newQuestion, placeholder: e.target.value })}
                        className={adminInputClass}
                      />
                    </AdminField>
                    <AdminField label="Help Text" span={3}>
                      <textarea
                        value={newQuestion.helpText}
                        onChange={(e) => setNewQuestion({ ...newQuestion, helpText: e.target.value })}
                        className={adminTextareaClass}
                        rows={2}
                      />
                    </AdminField>
                    <AdminField label="Options" hint="One option per line (for dropdown/radio/multi_select)" span={3}>
                      <textarea
                        value={newQuestion.options}
                        onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value })}
                        className={adminTextareaClass}
                        rows={3}
                        placeholder={'Yes\nNo\nOptional'}
                      />
                    </AdminField>
                  </AdminFormGrid>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newQuestion.isRequired}
                      onChange={(e) => setNewQuestion({ ...newQuestion, isRequired: e.target.checked })}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500"
                    />
                    Required field
                  </label>
                  <div className="flex gap-2">
                    <AdminButton
                      variant="primary"
                      disabled={saving || !newQuestion.questionKey || !newQuestion.label}
                      onClick={createQuestion}
                    >
                      Save Question
                    </AdminButton>
                    <AdminButton variant="ghost" onClick={() => setShowQuestionForm(false)}>
                      Cancel
                    </AdminButton>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {[1, 2, 3, 4].map((step) => {
                  const questions = questionsByStep.get(step) ?? [];
                  if (questions.length === 0) return null;
                  const stepMeta = WIZARD_STEPS.find((s) => s.step === step);
                  const stepStyle = STEP_STYLES[step - 1];

                  return (
                    <div key={step} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${stepStyle.badge}`}>
                          {step}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{stepMeta?.label ?? `Step ${step}`}</h3>
                          <p className="text-xs text-muted-foreground">{questions.length} questions</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {questions.map((q) => (
                          <QuestionEditor
                            key={q.id}
                            question={q}
                            saving={saving}
                            onSave={(fields) => patch({ entity: 'question', id: q.id, data: fields })}
                            onDelete={() => removeQuestion(q.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AdminSection>
          )}
        </>
      )}
    </div>
  );
}

function PackageEditor({
  pkg,
  saving,
  onSave,
}: {
  pkg: PartnerPackage;
  saving: boolean;
  onSave: (fields: Partial<PartnerPackage>) => void;
}) {
  const [name, setName] = useState(pkg.name);
  const [tagline, setTagline] = useState(pkg.tagline ?? '');
  const [bestFor, setBestFor] = useState(pkg.best_for ?? '');
  const [highlighted, setHighlighted] = useState(pkg.is_highlighted);

  useEffect(() => {
    setName(pkg.name);
    setTagline(pkg.tagline ?? '');
    setBestFor(pkg.best_for ?? '');
    setHighlighted(pkg.is_highlighted);
  }, [pkg]);

  return (
    <div className="rounded-xl border border-border/80 bg-gradient-to-br from-white to-violet-50/20 p-5 space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="CubeIcon" size={18} className="text-violet-600" />
          <span className="font-semibold text-foreground">{pkg.slug}</span>
          {highlighted && <AdminBadge variant="violet">Recommended</AdminBadge>}
        </div>
      </div>
      <AdminFormGrid cols={3}>
        <AdminField label="Package Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={adminInputClass} />
        </AdminField>
        <AdminField label="Tagline">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={adminInputClass} />
        </AdminField>
        <AdminField label="Best For">
          <input value={bestFor} onChange={(e) => setBestFor(e.target.value)} className={adminInputClass} />
        </AdminField>
      </AdminFormGrid>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={highlighted}
          onChange={(e) => setHighlighted(e.target.checked)}
          className="rounded border-border text-indigo-600 focus:ring-indigo-500"
        />
        Highlight as recommended package
      </label>
      <AdminButton variant="primary" size="sm" disabled={saving} onClick={() => onSave({ name, tagline, best_for: bestFor, is_highlighted: highlighted })}>
        Save Package
      </AdminButton>
    </div>
  );
}

function QuestionEditor({
  question,
  saving,
  onSave,
  onDelete,
}: {
  question: PartnerQuestion;
  saving: boolean;
  onSave: (fields: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState({
    label: question.label,
    question_type: question.question_type as QuestionType,
    placeholder: question.placeholder ?? '',
    help_text: question.help_text ?? '',
    wizard_step: question.wizard_step,
    display_order: question.display_order,
    is_required: question.is_required,
    group: question.validation_rules?.group ?? 'General',
    colSpan: question.validation_rules?.colSpan ?? 1,
    options: (question.options ?? []).join('\n'),
  });

  useEffect(() => {
    setDraft({
      label: question.label,
      question_type: question.question_type,
      placeholder: question.placeholder ?? '',
      help_text: question.help_text ?? '',
      wizard_step: question.wizard_step,
      display_order: question.display_order,
      is_required: question.is_required,
      group: question.validation_rules?.group ?? 'General',
      colSpan: question.validation_rules?.colSpan ?? 1,
      options: (question.options ?? []).join('\n'),
    });
  }, [question]);

  const handleSave = () => {
    onSave({
      label: draft.label,
      question_type: draft.question_type,
      placeholder: draft.placeholder || null,
      help_text: draft.help_text || null,
      wizard_step: draft.wizard_step,
      display_order: draft.display_order,
      is_required: draft.is_required,
      options: draft.options.split('\n').map((o) => o.trim()).filter(Boolean),
      validation_rules: {
        group: draft.group,
        colSpan: draft.colSpan,
      },
    });
  };

  return (
    <div className="rounded-xl border border-border bg-white p-5 space-y-4 hover:border-indigo-200 hover:shadow-sm transition-all group">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground">
            {question.question_key}
          </code>
          <AdminBadge variant="indigo">{draft.question_type.replace('_', ' ')}</AdminBadge>
          {draft.is_required && <AdminBadge variant="rose">Required</AdminBadge>}
          {question.id.startsWith('supp-') && <AdminBadge variant="amber">Supplementary</AdminBadge>}
        </div>
        <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
          <AdminButton variant="primary" size="sm" disabled={saving} onClick={handleSave}>
            Save
          </AdminButton>
          <AdminButton variant="danger" size="sm" disabled={saving || question.id.startsWith('supp-')} onClick={onDelete}>
            Delete
          </AdminButton>
        </div>
      </div>

      <AdminFormGrid cols={3}>
        <AdminField label="Label" span={2}>
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className={adminInputClass}
          />
        </AdminField>
        <AdminField label="Type">
          <select
            value={draft.question_type}
            onChange={(e) => setDraft({ ...draft, question_type: e.target.value as QuestionType })}
            className={adminSelectClass}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Wizard Step">
          <select
            value={draft.wizard_step}
            onChange={(e) => setDraft({ ...draft, wizard_step: Number(e.target.value) })}
            className={adminSelectClass}
          >
            {[1, 2, 3, 4].map((s) => (
              <option key={s} value={s}>Step {s}</option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Display Order">
          <input
            type="number"
            value={draft.display_order}
            onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })}
            className={adminInputClass}
          />
        </AdminField>
        <AdminField label="Group">
          <input
            value={draft.group}
            onChange={(e) => setDraft({ ...draft, group: e.target.value })}
            className={adminInputClass}
          />
        </AdminField>
        <AdminField label="Column Span">
          <select
            value={draft.colSpan}
            onChange={(e) => setDraft({ ...draft, colSpan: Number(e.target.value) })}
            className={adminSelectClass}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>{n} column{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Placeholder" span={2}>
          <input
            value={draft.placeholder}
            onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
            className={adminInputClass}
          />
        </AdminField>
        <AdminField label="Help Text" span={3}>
          <textarea
            value={draft.help_text}
            onChange={(e) => setDraft({ ...draft, help_text: e.target.value })}
            className={adminTextareaClass}
            rows={2}
          />
        </AdminField>
        <AdminField label="Options" hint="One per line" span={3}>
          <textarea
            value={draft.options}
            onChange={(e) => setDraft({ ...draft, options: e.target.value })}
            className={adminTextareaClass}
            rows={3}
          />
        </AdminField>
      </AdminFormGrid>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.is_required}
          onChange={(e) => setDraft({ ...draft, is_required: e.target.checked })}
          className="rounded border-border text-indigo-600 focus:ring-indigo-500"
        />
        Required field
      </label>
    </div>
  );
}
