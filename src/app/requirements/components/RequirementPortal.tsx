'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import RequirementField from '@/app/requirements/components/RequirementField';
import FileUploadZone from '@/app/requirements/components/FileUploadZone';
import type { PublicRequirementPayload, RequirementSection } from '@/lib/client-requirements/types';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS, LABEL_CLASS } from '@/lib/client-requirements/form-schemas';

type Answers = Record<string, Record<string, unknown>>;

function completionForSection(section: RequirementSection, answers: Answers) {
  const sectionAnswers = answers[section.slug] ?? {};
  return Object.values(sectionAnswers).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return String(value ?? '').trim().length > 0;
  });
}

export default function RequirementPortal() {
  const params = useParams();
  const token = params?.token as string;
  const [payload, setPayload] = useState<PublicRequirementPayload | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const dirtyRef = useRef(false);

  const loadPortal = useCallback((passwordValue = '') => {
    const query = passwordValue ? `?password=${encodeURIComponent(passwordValue)}` : '';
    setLoading(true);
    setError('');
    fetch(`/api/requirements/${token}${query}`)
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) {
          setNeedsPassword(body.error === 'Password required');
          setError(body.error || 'Requirement link is unavailable');
        } else {
          setNeedsPassword(false);
          setPayload(body);
          setAnswers(body.answers ?? {});
          const index =
            body.template?.requirement_sections?.findIndex(
              (section: RequirementSection) => section.slug === body.requirement?.current_section_slug
            ) ?? 0;
          if (index > 0) setActiveIndex(index);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const sections = useMemo(() => payload?.template.requirement_sections ?? [], [payload]);
  const activeSection = sections[activeIndex];
  const completeCount = sections.filter((section) => completionForSection(section, answers)).length;
  const progress = sections.length ? Math.round((completeCount / sections.length) * 100) : 0;

  const setAnswer = (sectionSlug: string, questionKey: string, value: unknown) => {
    dirtyRef.current = true;
    setAnswers((prev) => ({
      ...prev,
      [sectionSlug]: { ...(prev[sectionSlug] ?? {}), [questionKey]: value },
    }));
  };

  const save = useCallback(async () => {
    if (!payload || !activeSection) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/requirements/${token}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirementId: payload.requirement.id,
        password,
        answers,
        currentSectionSlug: activeSection.slug,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error || 'Save failed');
      return;
    }
    dirtyRef.current = false;
    setLastSaved(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  }, [activeSection, answers, password, payload, token]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirtyRef.current) save();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [save]);

  const upload = async (file: File, sectionSlug: string, fieldKey: string) => {
    if (!payload) return;
    const formData = new FormData();
    formData.set('token', token);
    formData.set('password', password);
    formData.set('requirementId', payload.requirement.id);
    formData.set('sectionSlug', sectionSlug);
    formData.set('fieldKey', fieldKey);
    formData.set('file', file);
    const res = await fetch('/api/requirements/upload', { method: 'POST', body: formData });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Upload failed');
      return;
    }
    setPayload((prev) => (prev ? { ...prev, attachments: [body, ...prev.attachments] } : prev));
  };

  const submit = async () => {
    if (!payload) return;
    const res = await fetch(`/api/requirements/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirementId: payload.requirement.id,
        password,
        answers,
        confirmedAccuracy: confirmed,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Submit failed');
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="page-container py-16">
        <p className="font-inter text-muted-foreground text-center">Loading your onboarding form…</p>
      </div>
    );
  }

  if (needsPassword && !payload) {
    return (
      <div className="page-container py-16 flex justify-center">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadPortal(password);
          }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5"
        >
          <div className="text-center">
            <p className="font-inter text-xs uppercase tracking-wider text-primary font-semibold">Protected link</p>
            <h1 className="font-bricolage text-2xl font-bold text-foreground mt-2">Enter password</h1>
            <p className="font-inter text-sm text-muted-foreground mt-2">This onboarding form is password protected.</p>
          </div>
          <label className="block">
            <span className={LABEL_CLASS}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
              autoFocus
            />
          </label>
          {error && (
            <p className="text-sm bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-lg">{error}</p>
          )}
          <button type="submit" className={`${BTN_PRIMARY} w-full`}>
            Continue
          </button>
        </form>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="page-container py-16">
        <div className="max-w-lg mx-auto rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <Icon name="ExclamationCircleIcon" size={32} className="mx-auto text-destructive mb-3" variant="solid" />
          <p className="font-inter text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page-container py-16 flex justify-center">
        <section className="max-w-xl rounded-2xl border border-border bg-card p-8 sm:p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <Icon name="CheckCircleIcon" size={32} className="text-green-600" variant="solid" />
          </div>
          <p className="font-inter text-sm font-semibold text-green-700">Submitted successfully</p>
          <h1 className="font-bricolage text-3xl font-bold text-foreground mt-2">Thank you</h1>
          <p className="font-inter text-muted-foreground mt-3 leading-relaxed">
            Your requirements have been submitted. Our team will review everything and reach out if we need any clarification.
          </p>
        </section>
      </div>
    );
  }

  if (!payload || !activeSection) return null;

  const sectionAttachments = payload.attachments.filter(
    (file) => file.section_slug === activeSection.slug && file.field_key === 'section_upload'
  );
  const canEdit = payload.requirement.status === 'draft' || payload.requirement.status === 'need_clarification';
  const visibleSections =
    payload.requirement.status === 'need_clarification' && payload.requirement.clarification_sections.length
      ? sections.filter((section) => payload.requirement.clarification_sections.includes(section.slug))
      : sections;
  const showSectionUpload = Boolean(activeSection.config?.upload);

  return (
    <>
      <section className="page-hero border-b border-border bg-card/50">
        <div className="page-container py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="font-bricolage text-xl sm:text-2xl font-bold text-foreground">{payload.project.project_name}</h1>
            <div className="w-full sm:w-56 shrink-0">
              <div className="flex items-center justify-between font-inter text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span className="font-semibold text-foreground">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="page-container py-4 sm:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-5">
          <aside className="lg:sticky lg:top-20 self-start">
            <nav className="rounded-xl border border-border bg-card p-2 shadow-sm space-y-0.5">
              <p className="font-inter text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">Sections</p>
              {visibleSections.map((section) => {
                const realIndex = sections.findIndex((item) => item.slug === section.slug);
                const done = completionForSection(section, answers);
                const active = activeSection.slug === section.slug;
                return (
                  <button
                    key={section.slug}
                    type="button"
                    onClick={() => setActiveIndex(realIndex)}
                    className={`w-full text-left px-2 py-1.5 rounded-md font-inter text-xs flex items-center gap-2 transition-colors ${
                      active ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        done ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : realIndex + 1}
                    </span>
                    <span className="leading-snug">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="font-inter text-[10px] text-muted-foreground">
                  Step {activeIndex + 1} of {sections.length}
                </p>
                <h2 className="font-bricolage text-lg font-bold text-foreground">{activeSection.title}</h2>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-inter text-[10px] text-muted-foreground shrink-0">
                <Icon name={saving ? 'ArrowPathIcon' : lastSaved ? 'CheckIcon' : 'ClockIcon'} size={12} />
                {saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved}` : 'Auto-saves every 30s'}
              </div>
            </div>

            {error && (
              <p className="text-sm bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-lg">{error}</p>
            )}
            {!canEdit && (
              <p className="text-sm bg-blue-50 text-blue-800 border border-blue-200 px-4 py-2 rounded-lg">
                This form has already been submitted. Contact us if you need to make changes.
              </p>
            )}

            <fieldset disabled={!canEdit} className="space-y-3.5 disabled:opacity-75">
              {activeSection.requirement_questions?.map((question) => (
                <RequirementField
                  key={question.id}
                  question={question}
                  sectionSlug={activeSection.slug}
                  value={answers[activeSection.slug]?.[question.question_key]}
                  disabled={!canEdit}
                  attachments={payload.attachments}
                  onChange={(value) => setAnswer(activeSection.slug, question.question_key, value)}
                  onUpload={(file, fieldKey) => upload(file, activeSection.slug, fieldKey)}
                />
              ))}

              {showSectionUpload && (
                <FileUploadZone
                  label="Additional files for this section"
                  helpText="Upload any supporting images, PDFs, or documents"
                  accept="image/*,application/pdf,.doc,.docx,.zip"
                  hint="Drop files here"
                  icon="CloudArrowUpIcon"
                  disabled={!canEdit}
                  files={sectionAttachments}
                  onUpload={(file) => upload(file, activeSection.slug, 'section_upload')}
                />
              )}
            </fieldset>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveIndex(Math.max(activeIndex - 1, 0))}
                disabled={activeIndex === 0}
                className={BTN_SECONDARY}
              >
                <Icon name="ArrowLeftIcon" size={14} />
                Previous
              </button>
              <button type="button" onClick={save} disabled={!canEdit || saving} className={BTN_SECONDARY}>
                Save draft
              </button>
              {activeIndex < sections.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveIndex(activeIndex + 1)}
                  className={BTN_PRIMARY}
                >
                  Next section
                  <Icon name="ArrowRightIcon" size={14} />
                </button>
              ) : null}
            </div>

            {activeIndex === sections.length - 1 && canEdit && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <label className="flex items-start gap-2 font-inter text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-ring"
                  />
                  <span>I confirm the information provided is accurate and ready for review.</span>
                </label>
                <button type="button" onClick={submit} disabled={!confirmed} className={BTN_PRIMARY}>
                  <Icon name="PaperAirplaneIcon" size={14} />
                  Submit requirements
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
