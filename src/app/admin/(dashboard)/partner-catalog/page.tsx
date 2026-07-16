'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import type { CategoryWithPackages, PartnerPackage, PartnerQuestion } from '@/lib/partner/catalog';

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

export default function PartnerCatalogAdminPage() {
  const [data, setData] = useState<AdminCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'packages' | 'questions'>('packages');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionKey: '',
    label: '',
    questionType: 'text',
    wizardStep: 4,
    isRequired: false,
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
      setMessage(result.error || 'Save failed');
      return;
    }
    setData(result);
    setMessage('Saved.');
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
        },
      }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(result.error || 'Failed to add question');
      return;
    }
    setData(result);
    setShowQuestionForm(false);
    setNewQuestion({ questionKey: '', label: '', questionType: 'text', wizardStep: 4, isRequired: false });
    setMessage('Question added.');
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
      setMessage(result.error || 'Delete failed');
      return;
    }
    setData(result);
    setMessage('Question deleted.');
  };

  const activeCategory = data?.catalog.find((c) => c.id === activeCategoryId);
  const activeTemplate = data?.templates.find((t) => t.id === activeTemplateId);

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
    return <p className="text-muted-foreground text-sm">Loading catalog…</p>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Partner Service Catalog"
        description="Manage service packages, comparison features, and discovery questionnaires shown in the Partner Portal."
      />

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {message}
        </p>
      )}

      <div className="flex gap-2">
        {(['packages', 'questions'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-white border border-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'packages' && data && (
        <>
          <div className="flex flex-wrap gap-2">
            {data.catalog.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  activeCategoryId === cat.id
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-white border border-border text-muted-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {activeCategory && (
            <>
              <AdminSection title="Packages" description={activeCategory.description ?? ''}>
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
                <AdminSection title="Comparison Features">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-2 pr-4">Feature</th>
                          {activeCategory.partner_packages.map((p) => (
                            <th key={p.id} className="pb-2 pr-4">{p.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {featureRows.map((row) => (
                          <tr key={row.key} className="border-b border-border/60">
                            <td className="py-2 pr-4 font-medium">{row.label}</td>
                            {activeCategory.partner_packages.map((pkg) => (
                              <td key={pkg.id} className="py-2 pr-4">
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
                                  className="w-full min-w-[80px] px-2 py-1 rounded border border-border text-xs"
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
                className={`px-3 py-1.5 rounded-full text-sm ${
                  activeTemplateId === t.id
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-white border border-border text-muted-foreground'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {activeTemplate && (
            <AdminSection
              title="Wizard Questions"
              description={`Step 1–4 questions for ${activeTemplate.service_type}`}
            >
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => setShowQuestionForm((v) => !v)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-muted"
                >
                  + Add Question
                </button>
              </div>

              {showQuestionForm && (
                <div className="border border-border/60 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={newQuestion.questionKey}
                      onChange={(e) => setNewQuestion({ ...newQuestion, questionKey: e.target.value })}
                      placeholder="question_key"
                      className="px-3 py-2 rounded-lg border border-border text-sm font-mono"
                    />
                    <input
                      value={newQuestion.label}
                      onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })}
                      placeholder="Question label"
                      className="px-3 py-2 rounded-lg border border-border text-sm"
                    />
                    <select
                      value={newQuestion.questionType}
                      onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-border text-sm"
                    >
                      {['text', 'textarea', 'number', 'date', 'dropdown', 'radio', 'checkbox', 'multi_select'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={newQuestion.wizardStep}
                      onChange={(e) => setNewQuestion({ ...newQuestion, wizardStep: Number(e.target.value) })}
                      className="px-3 py-2 rounded-lg border border-border text-sm"
                    >
                      {[1, 2, 3, 4].map((s) => (
                        <option key={s} value={s}>Step {s}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newQuestion.isRequired}
                      onChange={(e) => setNewQuestion({ ...newQuestion, isRequired: e.target.checked })}
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    disabled={saving || !newQuestion.questionKey || !newQuestion.label}
                    onClick={createQuestion}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    Save Question
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {activeTemplate.questions.map((q) => (
                  <div
                    key={q.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center border border-border/60 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{q.question_key}</p>
                      <input
                        defaultValue={q.label}
                        onBlur={(e) =>
                          patch({ entity: 'question', id: q.id, data: { label: e.target.value } })
                        }
                        className="mt-1 w-full px-2 py-1 rounded border border-border text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Step {q.wizard_step} · {q.question_type}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        defaultChecked={q.is_required}
                        onChange={(e) =>
                          patch({ entity: 'question', id: q.id, data: { is_required: e.target.checked } })
                        }
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
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
    <div className="border border-border/60 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border text-sm"
          placeholder="Package name"
        />
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border text-sm"
          placeholder="Tagline"
        />
        <input
          value={bestFor}
          onChange={(e) => setBestFor(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border text-sm"
          placeholder="Best for"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={highlighted}
          onChange={(e) => setHighlighted(e.target.checked)}
        />
        Highlighted (recommended)
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            name,
            tagline,
            best_for: bestFor,
            is_highlighted: highlighted,
          })
        }
        className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted disabled:opacity-50"
      >
        Save Package
      </button>
    </div>
  );
}
