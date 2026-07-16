'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import type { CategoryWithPackages, PartnerQuestion } from '@/lib/partner/catalog';
import { WIZARD_STEPS } from '@/lib/partner/catalog';
import { getVisibleQuestions, validateStepAnswers } from '@/lib/partner/questions';

interface RequirementWizardProps {
  initialCategoryId?: string;
  initialPackageId?: string;
  initialRequirementId?: string;
}

export default function RequirementWizard({
  initialCategoryId,
  initialPackageId,
  initialRequirementId,
}: RequirementWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<CategoryWithPackages[]>([]);
  const [questions, setQuestions] = useState<PartnerQuestion[]>([]);
  const [requirementId, setRequirementId] = useState(initialRequirementId ?? '');
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '');
  const [packageId, setPackageId] = useState(initialPackageId ?? '');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const selectedCategory = catalog.find((c) => c.id === categoryId);

  useEffect(() => {
    fetch('/api/partner/packages')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalog(data);
          if (!categoryId && data[0]) setCategoryId(data[0].id);
        }
      });
  }, [categoryId]);

  useEffect(() => {
    if (!selectedCategory) return;
    fetch(`/api/partner/questions?serviceType=${selectedCategory.slug}`)
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions ?? []));
  }, [selectedCategory?.slug]);

  useEffect(() => {
    if (!initialRequirementId) return;
    fetch(`/api/partner/requirements/${initialRequirementId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.requirement) {
          setRequirementId(data.requirement.id);
          setCategoryId(data.requirement.service_category_id ?? '');
          setPackageId(data.requirement.package_id ?? '');
          setAnswers({
            ...(data.requirement.business_data ?? {}),
            ...(data.requirement.project_data ?? {}),
            modules: data.requirement.modules_data,
            ...(data.answers ?? {}),
          });
        }
      });
  }, [initialRequirementId]);

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = useCallback(() => {
    const step1Keys = questions.filter((q) => q.wizard_step === 1).map((q) => q.question_key);
    const step2Keys = questions.filter((q) => q.wizard_step === 2).map((q) => q.question_key);
    const businessData: Record<string, unknown> = {};
    const projectData: Record<string, unknown> = {};
    const functionalAnswers: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(answers)) {
      if (k === 'modules') continue;
      if (step1Keys.includes(k)) businessData[k] = v;
      else if (step2Keys.includes(k)) projectData[k] = v;
      else functionalAnswers[k] = v;
    }

    return {
      id: requirementId || undefined,
      serviceCategoryId: categoryId,
      packageId: packageId,
      projectName: (answers.project_name as string) ?? null,
      industry: (answers.industry as string) ?? null,
      country: (answers.country as string) ?? null,
      budgetRange: (answers.budget_range as string) ?? null,
      timeline: (answers.expected_launch as string) ?? null,
      priority: (answers.priority as string) ?? null,
      businessData,
      projectData,
      modulesData: (answers.modules as string[]) ?? [],
      answers: functionalAnswers,
    };
  }, [answers, categoryId, packageId, questions, requirementId]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/partner/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.id) setRequirementId(data.id);
      setLastSaved(new Date());
      setMessage('Draft saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Object.keys(answers).length > 0) saveDraft();
    }, 60000);
    return () => clearInterval(timer);
  }, [answers, saveDraft]);

  const goNext = async () => {
    const stepErrors = validateStepAnswers(questions, answers, step);
    if (step === 2 && !packageId) {
      stepErrors.package = 'Please select a package';
    }
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    await saveDraft();
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmit = async () => {
    const stepErrors = validateStepAnswers(questions, answers, 4);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await saveDraft();
      const id = requirementId;
      if (!id) throw new Error('Save draft first');

      const res = await fetch(`/api/partner/requirements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/partner/requirements/${id}?submitted=1`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (q: PartnerQuestion) => {
    const val = answers[q.question_key];
    const err = errors[q.question_key];
    const baseClass =
      'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

    const field = (() => {
      switch (q.question_type) {
        case 'textarea':
          return (
            <textarea
              value={(val as string) ?? ''}
              onChange={(e) => setAnswer(q.question_key, e.target.value)}
              placeholder={q.placeholder ?? ''}
              rows={3}
              className={baseClass}
            />
          );
        case 'dropdown':
        case 'radio':
          return (
            <select
              value={(val as string) ?? ''}
              onChange={(e) => setAnswer(q.question_key, e.target.value)}
              className={baseClass}
            >
              <option value="">Select…</option>
              {q.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          );
        case 'multi_select':
          return (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const selected = Array.isArray(val) && val.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(val) ? val : [];
                      setAnswer(
                        q.question_key,
                        selected ? current.filter((v) => v !== opt) : [...current, opt]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          );
        case 'number':
          return (
            <input
              type="number"
              value={(val as number) ?? ''}
              onChange={(e) => setAnswer(q.question_key, e.target.value)}
              placeholder={q.placeholder ?? ''}
              className={baseClass}
            />
          );
        case 'date':
          return (
            <input
              type="date"
              value={(val as string) ?? ''}
              onChange={(e) => setAnswer(q.question_key, e.target.value)}
              className={baseClass}
            />
          );
        default:
          return (
            <input
              type="text"
              value={(val as string) ?? ''}
              onChange={(e) => setAnswer(q.question_key, e.target.value)}
              placeholder={q.placeholder ?? ''}
              className={baseClass}
            />
          );
      }
    })();

    return (
      <div key={q.question_key}>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {q.label}{q.is_required && ' *'}
        </label>
        {q.help_text && <p className="text-xs text-slate-400 mb-1">{q.help_text}</p>}
        {field}
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>
    );
  };

  const visibleQuestions = getVisibleQuestions(questions, answers, step);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900">New Requirement</h1>
          <p className="text-sm text-slate-500">Capture client requirements and generate Scope of Work</p>
        </div>
        {lastSaved && (
          <span className="text-xs text-slate-400">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.step} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => s.step < step && setStep(s.step)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step === s.step
                  ? 'bg-indigo-600 text-white'
                  : step > s.step
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > s.step ? '✓' : s.step}
            </button>
            <span className={`text-sm hidden sm:block ${step === s.step ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
              {s.label}
            </span>
            {i < 3 && <span className="text-slate-300 mx-1">→</span>}
          </div>
        ))}
      </div>

      {message && (
        <p className={`mb-4 text-sm px-4 py-2 rounded-lg ${message.includes('fail') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {step === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Service Category *</label>
              <div className="flex flex-wrap gap-2">
                {catalog.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setCategoryId(cat.id); setPackageId(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      categoryId === cat.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Package *</label>
                {errors.package && <p className="text-xs text-red-600 mb-1">{errors.package}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedCategory.partner_packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setPackageId(pkg.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        packageId === pkg.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 hover:border-indigo-200'
                      } ${pkg.is_highlighted ? 'ring-1 ring-indigo-200' : ''}`}
                    >
                      <p className="font-semibold text-slate-900">{pkg.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{pkg.best_for}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {visibleQuestions.map(renderField)}
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
        </div>
        <div className="flex gap-3">
          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
                  Generating SOW…
                </>
              ) : (
                <>
                  Submit & Generate SOW
                  <Icon name="SparklesIcon" size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <Link href="/partner/requirements" className="mt-4 inline-block text-sm text-slate-500 hover:text-indigo-600">
        ← Back to requirements
      </Link>
    </div>
  );
}
