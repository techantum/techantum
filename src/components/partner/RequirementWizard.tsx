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
  DIVISION_ICONS,
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
import { PartnerPageHero, partnerBtnGhost } from '@/components/partner/PartnerUi';

function RequirementTypeBanner({
  label,
  hint,
  onChange,
}: {
  label: string;
  hint: string;
  onChange: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Selected Requirement Type</p>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
        onClick={onChange}
      >
        <Icon name="PencilSquareIcon" size={12} />
        Change Type
      </button>
    </div>
  );
}

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

  const selectPackage = (division: string, plan: string) => {
    setDivisionSlug(division);
    setPlanSlug(plan);
    setModulesInitialized(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.package;
      return next;
    });
  };

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
    const stepErrors = validateStepAnswers(questions, answers, step);
    if (!planSlug || !divisionSlug) stepErrors.package = 'Select a service package before continuing';
    if (step === 3 && moduleOptions.length > 0) {
      const modules = Array.isArray(answers.modules) ? (answers.modules as string[]) : [];
      if (modules.length === 0) stepErrors.modules = 'Select at least one module';
    }
    return stepErrors;
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

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
    setStep(Math.min(5, step + 1));
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
  const suggestedModules = useMemo(
    () => (divisionSlug && planSlug ? getSuggestedModulesFromPlan(divisionSlug, planSlug) : []),
    [divisionSlug, planSlug]
  );
  const selectedEngagement = ENGAGEMENT_TYPES.find((item) => item.slug === engagementType);
  const requirementTypeLabel = selectedEngagement?.name ?? 'Standard Package';
  const requirementTypeHint = selectedEngagement?.description ?? 'Use questionnaire for the selected Website / Web App / Mobile plan.';
  const attachmentNames = Array.isArray(answers.attachment_names) ? (answers.attachment_names as string[]) : [];
  const whyWeAsk =
    step === 1
      ? 'These details help us understand your goals, prepare a relevant proposal, suggest the right solution, and provide a realistic timeline and accurate quotation.'
      : step === 2
        ? 'Project timing, budget, and audience help us size the work and recommend a realistic delivery plan.'
        : step === 3
          ? 'Confirming features and scope keeps the proposal aligned with what you actually need — and avoids surprises later.'
          : step === 4
            ? 'Notes and supporting context help our team review faster and quote more accurately.'
            : 'A final check ensures we review the right information before sending a proposal with timeline and cost.';

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
        key: q.question_key,
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
              key: 'requirement_type',
              label: 'Requirement Type',
              value: ENGAGEMENT_TYPES.find((e) => e.slug === engagementType)?.name ?? engagementType,
            }]
          : []),
        ...getVisibleQuestions(questions, answers, 2).map((q) => ({
          key: q.question_key,
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
            { key: 'service', label: 'Service', value: serviceInfo?.name ?? selectedCategory?.name ?? '—' },
            { key: 'package', label: 'Package', value: selectedPackage?.name ?? '—' },
            ...(selectedPackage?.includes && selectedPackage.includes.length > 0
              ? [{ key: 'plan_includes', label: 'Plan Includes', value: selectedPackage.includes.slice(0, 8).join(', ') + (selectedPackage.includes.length > 8 ? '…' : '') }]
              : []),
            { key: 'modules', label: 'Selected Modules', value: selectedModules.join(', ') || '—' },
            ...(customRequirements
              ? [{ key: 'custom_notes', label: 'Additional Notes', value: customRequirements }]
              : []),
            ...(attachmentNames.length > 0
              ? [{ key: 'attachments', label: 'Referenced files', value: attachmentNames.join(', ') }]
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
        key: q.question_key,
        label: q.label,
        value: formatAnswer(q),
      })),
    },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="mb-5">
          <PartnerPageHero
            eyebrow="New requirement"
            title="Create new requirement"
            description={
              step === 1
                ? 'Submit your project details to receive a proposal with timeline and cost.'
                : `Step ${step} of ${WIZARD_STEPS.length} — ${WIZARD_STEPS[step - 1]?.label}`
            }
            action={
              <Link href="/partner/requirements" className={partnerBtnGhost}>
                <Icon name="ArrowLeftIcon" size={16} />
                Back to Requirements
              </Link>
            }
          />
        </div>

        <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          {WIZARD_STEPS.map((item, index) => {
            const done = step > item.step;
            const active = step === item.step;
            return (
              <li key={item.step} className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (item.step <= step) setStep(item.step); }}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? 'bg-secondary text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? <Icon name="CheckIcon" size={16} /> : item.step}
                  </span>
                  <span className={`truncate text-sm ${active ? 'font-semibold text-secondary' : done ? 'font-medium text-slate-700' : 'text-slate-400'}`}>{item.label}</span>
                </button>
                {index < WIZARD_STEPS.length - 1 ? <span className="hidden h-px flex-1 bg-slate-200 sm:block" /> : null}
              </li>
            );
          })}
        </ol>

        {!planSlug && step > 1 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Select a service package on step 1 before continuing.
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          {step === 1 && (
            <>
              <div className="mb-6">
                <h2 className="mb-4 font-semibold text-slate-900">Select Package</h2>
                <div className="mb-4 flex flex-wrap gap-2">
                  {catalog.map((category) => (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => {
                        setDivisionSlug(category.slug);
                        if (!category.partner_packages.some((pkg) => pkg.slug === planSlug)) {
                          setPlanSlug('');
                          setModulesInitialized(false);
                        }
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                        divisionSlug === category.slug
                          ? 'border-secondary bg-orange-50 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-secondary/40'
                      }`}
                    >
                      <Icon
                        name={(DIVISION_ICONS[category.slug] ?? 'CubeIcon') as 'CubeIcon'}
                        size={18}
                        className={divisionSlug === category.slug ? 'text-secondary' : 'text-slate-400'}
                      />
                      {category.name}
                    </button>
                  ))}
                </div>
                {selectedCategory ? (
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {selectedCategory.partner_packages.map((pkg) => {
                      const selected = planSlug === pkg.slug;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => selectPackage(selectedCategory.slug, pkg.slug)}
                          className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                            selected
                              ? 'border-secondary bg-orange-50/80 ring-1 ring-secondary/20'
                              : 'border-slate-200 bg-white hover:border-secondary/40'
                          }`}
                        >
                          {selected ? (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-white">
                              <Icon name="CheckIcon" size={12} />
                            </span>
                          ) : null}
                          <p className="pr-6 text-sm font-semibold text-slate-900">{pkg.name}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{pkg.tagline || pkg.best_for}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-slate-500">Choose a service to see available plans.</p>
                )}
                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-slate-900">Need something custom?</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Contact us for enterprise or bespoke solutions beyond standard packages.
                    </p>
                  </div>
                  <Link
                    href="/partner/support"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Request Custom Solution
                  </Link>
                </div>
                {errors.package ? <p className="mt-2 text-xs text-red-600">{errors.package}</p> : null}
              </div>
              {planSlug ? (
                <>
              <EngagementTypeSelector
                value={engagementType}
                onChange={handleEngagementChange}
                loading={questionsLoading}
              />
              <h2 className="mb-4 font-semibold text-slate-900">Business Profile</h2>
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
              ) : null}
            </>
          )}

          {step === 2 && (
            <>
              <RequirementTypeBanner
                label={requirementTypeLabel}
                hint={requirementTypeHint}
                onChange={() => setStep(1)}
              />
              <h2 className="mb-4 font-semibold text-slate-900">Project Brief</h2>
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

          {step === 3 && (
            <>
              <RequirementTypeBanner
                label={requirementTypeLabel}
                hint={requirementTypeHint}
                onChange={() => setStep(1)}
              />
              <h2 className="mb-4 font-semibold text-slate-900">Features & Scope</h2>

              {selectedPackage && selectedCategory && (
                <div className="mb-6 rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
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
                      <span className="text-xs px-2 py-1 rounded-full bg-white border border-orange-200 text-secondary">
                        {serviceInfo.description.slice(0, 60)}…
                      </span>
                    )}
                  </div>
                  {(selectedPackage.includes ?? []).length > 0 && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                      {(selectedPackage.includes ?? []).slice(0, 12).map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <Icon name="CheckIcon" size={12} className="text-green-600 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                      {(selectedPackage.includes ?? []).length > 12 && (
                        <li className="text-xs text-slate-400">+{(selectedPackage.includes ?? []).length - 12} more…</li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              <h3 className="mb-3 text-sm font-medium text-slate-800">Confirm Required Modules</h3>
              {errors.modules && (
                <p className="text-xs text-red-600 mb-3">{errors.modules}</p>
              )}
              {moduleOptions.length === 0 ? (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  Scope for <strong>{requirementTypeLabel}</strong> will be captured in the next step. You can still note anything unique here.
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {moduleOptions.map((mod) => {
                  const selected = selectedModules.includes(mod.key);
                  const inPlan = suggestedModules.includes(mod.key);
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      onClick={() => toggleModule(mod.key)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-secondary bg-orange-50/70'
                          : 'border-slate-200 hover:border-secondary/40'
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center">
                          <Icon name="CheckIcon" size={12} />
                        </span>
                      )}
                      {inPlan && !selected && (
                        <span className="absolute top-3 right-3 text-[10px] font-medium text-secondary bg-orange-50 px-1.5 py-0.5 rounded">
                          In plan
                        </span>
                      )}
                      <Icon
                        name={mod.icon as 'DocumentTextIcon'}
                        size={22}
                        className={selected ? 'text-secondary' : 'text-slate-400'}
                      />
                      <p className="font-semibold text-slate-900 mt-2 text-sm">{mod.label}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
                    </button>
                  );
                })}
              </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Additional Requirements or Questions
                </label>
                <textarea
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  placeholder="e.g. Client needs WhatsApp lead routing, multilingual support, or has concerns about migration downtime…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <RequirementTypeBanner
                label={requirementTypeLabel}
                hint={requirementTypeHint}
                onChange={() => setStep(1)}
              />
              <div>
                <h2 className="mb-4 font-semibold text-slate-900">Files & Notes</h2>
                <label className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center hover:border-secondary/40">
                  <Icon name="PaperClipIcon" size={22} className="text-secondary" />
                  <p className="mt-2 text-sm font-semibold text-slate-800">Add file names or references</p>
                  <p className="mt-1 text-xs text-slate-500">List documents you already have — brand kit, sitemap, current site access, etc.</p>
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const names = Array.from(event.target.files ?? []).map((file) => file.name);
                      if (names.length === 0) return;
                      setAnswer('attachment_names', [...new Set([...attachmentNames, ...names])]);
                      event.target.value = '';
                    }}
                  />
                </label>
                {attachmentNames.length > 0 ? (
                  <ul className="mb-5 flex flex-wrap gap-2">
                    {attachmentNames.map((name) => (
                      <li key={name} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                        {name}
                        <button
                          type="button"
                          className="font-semibold text-slate-400 hover:text-red-500"
                          onClick={() => setAnswer('attachment_names', attachmentNames.filter((item) => item !== name))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex flex-col gap-5 lg:flex-row">
                <nav className="flex gap-1 overflow-x-auto pb-2 lg:w-52 lg:shrink-0 lg:flex-col lg:pb-0">
                  {functionalGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setFunctionalGroup(group)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                        functionalGroup === group
                          ? 'bg-secondary text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </nav>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-4 text-sm font-semibold text-slate-800">{functionalGroup}</h3>
                  <WizardFieldGrid
                    questions={stepQuestions}
                    answers={answers}
                    errors={errors}
                    onChange={setAnswer}
                  />
                  {stepQuestions.length === 0 && (
                    <p className="text-sm italic text-slate-400">No questions in this category.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <RequirementTypeBanner
                label={requirementTypeLabel}
                hint={requirementTypeHint}
                onChange={() => setStep(1)}
              />
              <h2 className="font-semibold text-slate-900">Review & Submit</h2>
              {reviewSections.map((section) => (
                <div key={section.title} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Icon name="ClipboardDocumentListIcon" size={18} className="text-secondary" />
                      <span className="font-medium text-slate-900">{section.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(section.step)}
                      className="text-xs font-medium text-secondary hover:text-secondary"
                    >
                      Edit
                    </button>
                  </div>
                  <dl className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {section.items.map((item) => (
                      <div key={item.key ?? item.label}>
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
                  className="mt-0.5 rounded border-slate-300 text-secondary focus:ring-secondary/20"
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/partner/requirements')}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90"
              >
                Save & Continue
                <Icon name="ArrowRightIcon" size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Requirement'}
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="xl:w-80 shrink-0 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Plan</p>
            <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-secondary">
              Change Plan
            </button>
          </div>
          {selectedPackage && selectedCategory ? (
            <>
              <p className="font-semibold text-slate-900">{selectedCategory.name}</p>
              <p className="text-sm font-medium text-secondary">{selectedPackage.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{selectedPackage.tagline}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Choose a service package to continue.</p>
          )}
          {errors.package && <p className="mt-2 text-xs text-red-600">{errors.package}</p>}
        </div>

        {step === 1 ? (
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Icon name="LightBulbIcon" size={16} className="text-secondary" /> What happens next?
            </p>
            <ol className="space-y-2 text-sm text-slate-600">
              <li>1. Submit your requirement</li>
              <li>2. Receive proposal with timeline & cost</li>
              <li>3. Get quotation by email</li>
              <li>4. Synced to admin dashboard</li>
            </ol>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Your progress</p>
            <ul className="space-y-2">
              {WIZARD_STEPS.map((item) => (
                <li key={item.step} className="flex items-center gap-2 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${step > item.step ? 'bg-emerald-100 text-emerald-700' : step === item.step ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {step > item.step ? <Icon name="CheckIcon" size={12} /> : item.step}
                  </span>
                  <span className={step === item.step ? 'font-semibold text-slate-900' : 'text-slate-500'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Icon name="LightBulbIcon" size={16} className="text-secondary" /> Why we ask this
          </p>
          <p className="text-sm leading-relaxed text-slate-600">{whyWeAsk}</p>
        </div>
      </aside>
    </div>
  );
}
