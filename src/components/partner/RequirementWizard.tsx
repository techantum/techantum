'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import EngagementTypeSelector from '@/components/partner/EngagementTypeSelector';
import WizardFieldGrid from '@/components/partner/WizardFieldGrid';
import type { PartnerQuestion } from '@/lib/partner/catalog';
import { WIZARD_STEPS } from '@/lib/partner/catalog';
import {
  ENGAGEMENT_TYPES,
  getQuestionServiceType,
  getSuggestedModulesFromPlan,
  type PartnerCatalogCategory,
} from '@/lib/partner/service-catalog';
import {
  FUNCTIONAL_GROUPS,
  getModulesForService,
  getQuestionGroup,
  normalizeServiceType,
  SERVICE_LABELS,
} from '@/lib/partner/wizard-config';
import { getVisibleQuestions, validateStepAnswers } from '@/lib/partner/questions';

interface RequirementWizardProps {
  initialDivision?: string;
  initialPlan?: string;
  initialCategoryId?: string;
  initialPackageId?: string;
  initialRequirementId?: string;
  initialEngagement?: string;
}

export default function RequirementWizard({
  initialDivision,
  initialPlan,
  initialCategoryId,
  initialPackageId,
  initialRequirementId,
  initialEngagement,
}: RequirementWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<PartnerCatalogCategory[]>([]);
  const [questions, setQuestions] = useState<PartnerQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [requirementId, setRequirementId] = useState(initialRequirementId ?? '');
  const [divisionSlug, setDivisionSlug] = useState(initialDivision ?? '');
  const [planSlug, setPlanSlug] = useState(initialPlan ?? '');
  const [engagementType, setEngagementType] = useState<string>(initialEngagement ?? '');
  const [answers, setAnswers] = useState<Record<string, unknown>>({ modules: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [functionalGroup, setFunctionalGroup] = useState('General');
  const [customRequirements, setCustomRequirements] = useState('');

  const [modulesInitialized, setModulesInitialized] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(!initialRequirementId);

  const selectedCategory = catalog.find((c) => c.slug === divisionSlug);
  const selectedPackage = selectedCategory?.partner_packages.find((p) => p.slug === planSlug);
  const questionServiceType = engagementType || getQuestionServiceType(divisionSlug);
  const serviceInfo = SERVICE_LABELS[divisionSlug] ?? SERVICE_LABELS[normalizeServiceType(questionServiceType)];
  const moduleOptions = getModulesForService(divisionSlug || questionServiceType);

  useEffect(() => {
    fetch('/api/partner/packages')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalog(data);
          if (!divisionSlug && initialDivision) setDivisionSlug(initialDivision);
          else if (!divisionSlug && data[0]) setDivisionSlug(data[0].slug);
          if (!planSlug && initialPlan) setPlanSlug(initialPlan);
        }
      });
  }, [divisionSlug, initialDivision, initialPlan, planSlug]);

  useEffect(() => {
    if (!divisionSlug && !engagementType) return;
    setQuestionsLoading(true);
    const params = new URLSearchParams();
    if (divisionSlug) params.set('division', divisionSlug);
    if (engagementType) params.set('engagement', engagementType);
    fetch(`/api/partner/questions?${params}`)
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions ?? []))
      .catch(() => setQuestions([]))
      .finally(() => setQuestionsLoading(false));
  }, [divisionSlug, engagementType]);

  const handleEngagementChange = (slug: string) => {
    setEngagementType(slug);
    const groups =
      FUNCTIONAL_GROUPS[slug ? normalizeServiceType(slug) : normalizeServiceType(divisionSlug)] ??
      FUNCTIONAL_GROUPS.website ??
      ['General'];
    setFunctionalGroup(groups[0] ?? 'General');
  };

  useEffect(() => {
    if (!initialRequirementId) return;
    fetch(`/api/partner/requirements/${initialRequirementId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.requirement) {
          setRequirementId(data.requirement.id);
          setDivisionSlug(data.requirement.division_slug ?? data.requirement.partner_service_categories?.slug ?? '');
          setPlanSlug(data.requirement.plan_slug ?? data.requirement.partner_packages?.slug ?? '');
          setEngagementType(data.requirement.engagement_type ?? '');
          setAnswers({
            ...(data.requirement.business_data ?? {}),
            ...(data.requirement.project_data ?? {}),
            modules: data.requirement.modules_data ?? [],
            ...(data.answers ?? {}),
          });
          setCustomRequirements(String(data.requirement.project_data?.custom_requirements ?? ''));
          setDraftLoaded(true);
        }
      });
  }, [initialRequirementId]);

  useEffect(() => {
    if (!planSlug || !divisionSlug || modulesInitialized || !draftLoaded) return;
    const current = Array.isArray(answers.modules) ? (answers.modules as string[]) : [];
    if (current.length > 0) {
      setModulesInitialized(true);
      return;
    }
    const suggested = getSuggestedModulesFromPlan(divisionSlug, planSlug);
    if (suggested.length > 0) {
      setAnswers((prev) => ({ ...prev, modules: suggested }));
    }
    setModulesInitialized(true);
  }, [planSlug, divisionSlug, modulesInitialized, draftLoaded, answers.modules]);

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleModule = (key: string) => {
    const current = Array.isArray(answers.modules) ? (answers.modules as string[]) : [];
    setAnswer(
      'modules',
      current.includes(key) ? current.filter((m) => m !== key) : [...current, key]
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next.modules;
      return next;
    });
  };

  const buildPayload = useCallback(() => {
    const step1Keys = questions.filter((q) => q.wizard_step === 1).map((q) => q.question_key);
    const step2Keys = questions.filter((q) => q.wizard_step === 2).map((q) => q.question_key);
    const businessData: Record<string, unknown> = {};
    const projectData: Record<string, unknown> = { custom_requirements: customRequirements };
    const functionalAnswers: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(answers)) {
      if (k === 'modules') continue;
      if (step1Keys.includes(k)) businessData[k] = v;
      else if (step2Keys.includes(k)) projectData[k] = v;
      else functionalAnswers[k] = v;
    }

    return {
      id: requirementId || undefined,
      divisionSlug,
      planSlug,
      engagementType: engagementType || null,
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
  }, [answers, customRequirements, divisionSlug, engagementType, planSlug, questions, requirementId]);

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
      if (Object.keys(answers).length > 1) saveDraft();
    }, 60000);
    return () => clearInterval(timer);
  }, [answers, saveDraft]);

  const validateCurrentStep = (): Record<string, string> => {
    if (step === 5) {
      if (!confirmed) return { confirmed: 'Please confirm the information is accurate' };
      return {};
    }
    if (step === 3 && engagementType) return {};
    const stepErrors = validateStepAnswers(questions, answers, step);
    if (!planSlug || !divisionSlug) stepErrors.package = 'Select a service package before continuing';
    return stepErrors;
  };

  const goBack = () => {
    setStep((s) => {
      if (s === 4 && engagementType) return 2;
      return Math.max(1, s - 1);
    });
  };

  useEffect(() => {
    if (engagementType && step === 3) setStep(4);
  }, [engagementType, step]);

  const isStepSkipped = (wizardStep: number) => wizardStep === 3 && !!engagementType;

  const goNext = async () => {
    const stepErrors = validateCurrentStep();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      if (step === 4) {
        const firstKey = Object.keys(stepErrors)[0];
        const q = questions.find((item) => item.question_key === firstKey);
        if (q) setFunctionalGroup(getQuestionGroup(q));
      }
      return;
    }
    setErrors({});
    if (step < 5) await saveDraft();
    let next = step + 1;
    if (engagementType && next === 3) next = 4;
    setStep(Math.min(5, next));
  };

  const handleSubmit = async () => {
    const stepErrors = validateCurrentStep();
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

  const stepQuestions = useMemo(() => {
    const visible = getVisibleQuestions(questions, answers, step).filter(
      (q) => q.question_key !== 'modules'
    );
    if (step !== 4) return visible;

    return visible.filter((q) => getQuestionGroup(q) === functionalGroup);
  }, [answers, functionalGroup, questions, step]);

  const functionalGroups =
    FUNCTIONAL_GROUPS[engagementType ? normalizeServiceType(engagementType) : normalizeServiceType(divisionSlug)] ??
    FUNCTIONAL_GROUPS.website ??
    ['General'];
  const selectedModules = Array.isArray(answers.modules) ? (answers.modules as string[]) : [];

  const formatAnswer = (q: PartnerQuestion): string => {
    const val = answers[q.question_key];
    if (Array.isArray(val)) return val.join(', ') || '—';
    if (val === undefined || val === null || val === '') return '—';
    return String(val);
  };

  const reviewSections = [
    {
      title: 'Business Details',
      step: 1,
      items: getVisibleQuestions(questions, answers, 1).map((q) => ({
        label: q.label,
        value: formatAnswer(q),
      })),
    },
    {
      title: 'Project Details',
      step: 2,
      items: [
        ...(engagementType
          ? [{
              label: 'Requirement Type',
              value: ENGAGEMENT_TYPES.find((e) => e.slug === engagementType)?.name ?? engagementType,
            }]
          : []),
        ...getVisibleQuestions(questions, answers, 2).map((q) => ({
          label: q.label,
          value: formatAnswer(q),
        })),
      ],
    },
    ...(!engagementType
      ? [{
          title: 'Modules & Features',
          step: 3,
          items: [
            { label: 'Service', value: serviceInfo?.name ?? selectedCategory?.name ?? '—' },
            { label: 'Package', value: selectedPackage?.name ?? '—' },
            ...(selectedPackage?.includes && selectedPackage.includes.length > 0
              ? [{ label: 'Plan Includes', value: selectedPackage.includes.slice(0, 8).join(', ') + (selectedPackage.includes.length > 8 ? '…' : '') }]
              : []),
            { label: 'Selected Modules', value: selectedModules.join(', ') || '—' },
            ...(customRequirements
              ? [{ label: 'Additional Notes', value: customRequirements }]
              : []),
          ],
        }]
      : []),
    {
      title: engagementType
        ? `${ENGAGEMENT_TYPES.find((e) => e.slug === engagementType)?.name ?? 'Focused'} Requirements`
        : 'Functional Requirements',
      step: 4,
      items: getVisibleQuestions(questions, answers, 4).map((q) => ({
        label: q.label,
        value: formatAnswer(q),
      })),
    },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bricolage text-2xl font-bold text-slate-900">Gather Client Requirements</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Step {step} of {WIZARD_STEPS.length} — {WIZARD_STEPS[step - 1]?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
          </div>
        </div>

        <EngagementTypeSelector
          value={engagementType}
          onChange={handleEngagementChange}
          loading={questionsLoading}
        />

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {WIZARD_STEPS.map((s, i) => {
            const skipped = isStepSkipped(s.step);
            return (
            <div key={s.step} className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (skipped || s.step > step) return;
                  if (s.step === 3 && engagementType) return;
                  setStep(s.step);
                }}
                disabled={skipped || s.step > step}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
                  step === s.step ? 'bg-indigo-50' : ''
                } ${skipped ? 'opacity-40 cursor-not-allowed' : s.step <= step ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    skipped
                      ? 'bg-slate-100 text-slate-300 line-through'
                      : step === s.step
                      ? 'bg-indigo-600 text-white'
                      : step > s.step
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {skipped ? '—' : step > s.step ? '✓' : s.step}
                </span>
                <span
                  className={`text-xs sm:text-sm whitespace-nowrap ${
                    skipped ? 'text-slate-300 line-through' : step === s.step ? 'font-medium text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <span className="text-slate-300 mx-0.5 hidden sm:inline">→</span>
              )}
            </div>
            );
          })}
        </div>

        {!planSlug && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            Select a service package first.{' '}
            <Link href="/partner/packages" className="font-medium underline">
              Compare packages
            </Link>
          </div>
        )}

        {message && (
          <p
            className={`mb-4 text-sm px-4 py-2 rounded-lg ${
              message.toLowerCase().includes('fail') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {message}
          </p>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
          {step === 1 && (
            <>
              <h2 className="font-semibold text-slate-900 mb-4">Business Details</h2>
              {questionsLoading ? (
                <p className="text-sm text-slate-500 py-8 text-center">Loading form fields…</p>
              ) : stepQuestions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-600">No form fields available for this service.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Ensure question templates are seeded in the database, or try selecting a different plan.
                  </p>
                </div>
              ) : (
                <WizardFieldGrid
                  questions={stepQuestions}
                  answers={answers}
                  errors={errors}
                  onChange={setAnswer}
                />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-semibold text-slate-900 mb-4">Project Details</h2>
              {questionsLoading ? (
                <p className="text-sm text-slate-500 py-8 text-center">Loading form fields…</p>
              ) : stepQuestions.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No project fields configured.</p>
              ) : (
                <WizardFieldGrid
                  questions={stepQuestions}
                  answers={answers}
                  errors={errors}
                  onChange={setAnswer}
                />
              )}
            </>
          )}

          {step === 3 && !engagementType && (
            <>
              <h2 className="font-semibold text-slate-900 mb-1">Modules & Features</h2>
              <p className="text-sm text-slate-500 mb-4">
                Review what&apos;s included in your selected plan, then confirm or adjust modules for your client.
              </p>

              {selectedPackage && selectedCategory && (
                <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                        Selected Plan
                      </p>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {serviceInfo?.name ?? selectedCategory.name} — {selectedPackage.name}
                      </p>
                      {selectedPackage.description && (
                        <p className="text-xs text-slate-600 mt-1">{selectedPackage.description}</p>
                      )}
                    </div>
                    {serviceInfo && (
                      <span className="text-xs px-2 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700">
                        {serviceInfo.description.slice(0, 60)}…
                      </span>
                    )}
                  </div>
                  {selectedPackage.includes.length > 0 && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                      {selectedPackage.includes.slice(0, 12).map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <Icon name="CheckIcon" size={12} className="text-green-600 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                      {selectedPackage.includes.length > 12 && (
                        <li className="text-xs text-slate-400">+{selectedPackage.includes.length - 12} more…</li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              <h3 className="text-sm font-medium text-slate-800 mb-2">Confirm Required Modules</h3>
              <p className="text-xs text-slate-500 mb-3">
                Modules relevant to {serviceInfo?.name ?? 'this service'} are shown below. Select what your client needs beyond the plan.
              </p>
              {errors.modules && (
                <p className="text-xs text-red-600 mb-3">{errors.modules}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {moduleOptions.map((mod) => {
                  const selected = selectedModules.includes(mod.key);
                  const inPlan = getSuggestedModulesFromPlan(divisionSlug, planSlug).includes(mod.key);
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      onClick={() => toggleModule(mod.key)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Icon name="CheckIcon" size={12} />
                        </span>
                      )}
                      {inPlan && !selected && (
                        <span className="absolute top-3 right-3 text-[10px] font-medium text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                          In plan
                        </span>
                      )}
                      <Icon
                        name={mod.icon as 'DocumentTextIcon'}
                        size={22}
                        className={selected ? 'text-indigo-600' : 'text-slate-400'}
                      />
                      <p className="font-semibold text-slate-900 mt-2 text-sm">{mod.label}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Additional Requirements or Questions for Client
                </label>
                <p className="text-xs text-slate-500 mb-1.5">
                  Note anything not covered above — pain points, integrations, or open questions to clarify with the client.
                </p>
                <textarea
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  placeholder="e.g. Client needs WhatsApp lead routing, multilingual support, or has concerns about migration downtime…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col lg:flex-row gap-5">
              <nav className="lg:w-52 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
                {functionalGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setFunctionalGroup(group)}
                    className={`whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      functionalGroup === group
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </nav>
              <div className="flex-1 min-w-0">
                {engagementType && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-1">
                    {ENGAGEMENT_TYPES.find((e) => e.slug === engagementType)?.name}
                  </p>
                )}
                <h2 className="font-semibold text-slate-900 mb-1">{functionalGroup}</h2>
                <p className="text-sm text-slate-500 mb-4">
                  {engagementType
                    ? 'Answer the questions below specific to this client requirement type.'
                    : 'Answer the questions below to help us scope the project accurately.'}
                </p>
                <WizardFieldGrid
                  questions={stepQuestions}
                  answers={answers}
                  errors={errors}
                  onChange={setAnswer}
                />
                {stepQuestions.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No questions in this category.</p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-900">Review & Summary</h2>
              <p className="text-sm text-slate-500">
                Review all captured information before submitting. A Scope of Work (PDF) will be generated automatically.
              </p>
              {reviewSections.map((section) => (
                <div key={section.title} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Icon name="ClipboardDocumentListIcon" size={18} className="text-indigo-600" />
                      <span className="font-medium text-slate-900">{section.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(section.step)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                  </div>
                  <dl className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {section.items.map((item) => (
                      <div key={item.label}>
                        <dt className="text-xs text-slate-500">{item.label}</dt>
                        <dd className="text-sm text-slate-900 mt-0.5">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    if (e.target.checked) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.confirmed;
                        return next;
                      });
                    }
                  }}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  I confirm that the information provided is accurate and complete to the best of my knowledge.
                </span>
              </label>
              {errors.confirmed && (
                <p className="text-xs text-red-600">{errors.confirmed}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save & Next
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
                    Submit Requirement
                    <Icon name="SparklesIcon" size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="xl:w-72 shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Selected Plan
          </p>
          {selectedPackage && selectedCategory ? (
            <>
              <p className="font-semibold text-slate-900">{selectedCategory.name}</p>
              <p className="text-sm text-indigo-600 font-medium mt-0.5">{selectedPackage.name}</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{selectedPackage.tagline}</p>
              <Link
                href={`/partner/packages?division=${divisionSlug}`}
                className="inline-block mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Change Plan
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-500">No plan selected</p>
          )}
          {errors.package && <p className="text-xs text-red-600 mt-2">{errors.package}</p>}
        </div>

        {engagementType && (
          <div className="bg-white rounded-xl border border-indigo-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-2">
              Requirement Type
            </p>
            <p className="font-semibold text-slate-900">
              {ENGAGEMENT_TYPES.find((e) => e.slug === engagementType)?.name ?? engagementType}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {ENGAGEMENT_TYPES.find((e) => e.slug === engagementType)?.description}
            </p>
          </div>
        )}

        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-2">
            Why we need this
          </p>
          <p className="text-sm text-indigo-900 leading-relaxed">
            Our goal is to understand your client&apos;s pain points clearly so we can propose the right solution — answer only what you know; you can clarify details later via Quick Chat.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Progress
          </p>
          <ul className="space-y-2">
            {WIZARD_STEPS.map((s) => {
              const skipped = isStepSkipped(s.step);
              return (
              <li key={s.step} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    skipped
                      ? 'bg-slate-100 text-slate-300'
                      : step > s.step
                      ? 'bg-green-100 text-green-700'
                      : step === s.step
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {skipped ? '—' : step > s.step ? '✓' : s.step}
                </span>
                <span
                  className={
                    skipped
                      ? 'text-slate-300 line-through'
                      : step === s.step
                        ? 'font-medium text-slate-900'
                        : 'text-slate-500'
                  }
                >
                  {s.label}
                  {skipped ? ' (skipped)' : ''}
                </span>
              </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
