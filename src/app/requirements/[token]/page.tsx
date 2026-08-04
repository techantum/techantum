'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { PublicRequirementPayload, RequirementQuestion, RequirementSection } from '@/lib/client-requirements/types';

type Answers = Record<string, Record<string, unknown>>;

const SERVICE_FIELDS = ['service_name', 'overview', 'how_it_works', 'features', 'benefits', 'industries_served', 'types', 'execution_process'];
const PROJECT_FIELDS = ['project_name', 'location', 'category', 'description', 'highlights', 'completion_year', 'client_name', 'status'];
const TESTIMONIAL_FIELDS = ['client_name', 'designation', 'company', 'testimonial', 'photo_url', 'logo_url', 'awards', 'certifications', 'case_studies'];

function emptyFor(type: 'services' | 'projects' | 'testimonials') {
  const fields = type === 'services' ? SERVICE_FIELDS : type === 'projects' ? PROJECT_FIELDS : TESTIMONIAL_FIELDS;
  return Object.fromEntries(fields.map((field) => [field, '']));
}

function valueToString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function completionForSection(section: RequirementSection, answers: Answers) {
  const sectionAnswers = answers[section.slug] ?? {};
  const hasValue = Object.values(sectionAnswers).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return String(value ?? '').trim().length > 0;
  });
  return hasValue;
}

export default function PublicRequirementPage() {
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
        }
        else {
          setNeedsPassword(false);
          setPayload(body);
          setAnswers(body.answers ?? {});
          const index = body.template?.requirement_sections?.findIndex((section: RequirementSection) => section.slug === body.requirement?.current_section_slug) ?? 0;
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
  }, [activeSection, answers, payload, token]);

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
    setPayload((prev) => prev ? { ...prev, attachments: [body, ...prev.attachments] } : prev);
  };

  const submit = async () => {
    if (!payload) return;
    const res = await fetch(`/api/requirements/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementId: payload.requirement.id, password, answers, confirmedAccuracy: confirmed }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Submit failed');
      return;
    }
    setSubmitted(true);
  };

  const renderRepeatable = (question: RequirementQuestion, type: 'services' | 'projects' | 'testimonials') => {
    const rows = Array.isArray(answers[activeSection.slug]?.[question.question_key])
      ? (answers[activeSection.slug][question.question_key] as Record<string, string>[])
      : [];
    const fields = type === 'services' ? SERVICE_FIELDS : type === 'projects' ? PROJECT_FIELDS : TESTIMONIAL_FIELDS;
    return (
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-lg border border-slate-200 p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-sm">{question.label} {rowIndex + 1}</p>
              <button type="button" onClick={() => setAnswer(activeSection.slug, question.question_key, rows.filter((_, i) => i !== rowIndex))} className="text-xs text-rose-600">Delete</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((field) => (
                <label key={field} className="text-xs font-medium capitalize">
                  {field.replace(/_/g, ' ')}
                  <textarea value={row[field] ?? ''} onChange={(e) => {
                    const next = rows.map((item, i) => i === rowIndex ? { ...item, [field]: e.target.value } : item);
                    setAnswer(activeSection.slug, question.question_key, next);
                  }} rows={field.includes('description') || field.includes('overview') || field.includes('testimonial') ? 3 : 1} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setAnswer(activeSection.slug, question.question_key, [...rows, emptyFor(type)])} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Add {question.label}</button>
      </div>
    );
  };

  const renderQuestion = (question: RequirementQuestion) => {
    const value = answers[activeSection.slug]?.[question.question_key];
    if (question.field_type === 'services') return renderRepeatable(question, 'services');
    if (question.field_type === 'projects') return renderRepeatable(question, 'projects');
    if (question.field_type === 'testimonials') return renderRepeatable(question, 'testimonials');
    if (question.field_type === 'multiselect') {
      const selected = Array.isArray(value) ? value as string[] : [];
      return (
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((option) => (
            <label key={option} className="flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.includes(option)} onChange={(e) => setAnswer(activeSection.slug, question.question_key, e.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />
              {option}
            </label>
          ))}
        </div>
      );
    }
    if (question.field_type === 'textarea') {
      return <textarea value={valueToString(value)} onChange={(e) => setAnswer(activeSection.slug, question.question_key, e.target.value)} rows={5} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />;
    }
    return <input type={question.field_type === 'url' ? 'url' : 'text'} value={valueToString(value)} onChange={(e) => setAnswer(activeSection.slug, question.question_key, e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />;
  };

  if (loading) return <main className="min-h-screen bg-slate-50 p-6 text-slate-600">Loading requirement form...</main>;
  if (needsPassword && !payload) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <form onSubmit={(event) => { event.preventDefault(); loadPortal(password); }} className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold">Protected Link</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Enter Password</h1>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" autoFocus />
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button className="w-full rounded-lg bg-slate-950 text-white px-4 py-2 text-sm font-semibold">Open Requirement Form</button>
        </form>
      </main>
    );
  }
  if (error && !payload) return <main className="min-h-screen bg-slate-50 p-6 text-rose-700">{error}</main>;
  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <section className="max-w-xl rounded-2xl bg-white border border-slate-200 p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-green-700">Submitted</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Thank you</h1>
          <p className="mt-3 text-slate-600">Your requirements have been submitted to TechAntum. Our team will review the information and follow up if anything needs clarification.</p>
        </section>
      </main>
    );
  }
  if (!payload || !activeSection) return null;

  const sectionAttachments = payload.attachments.filter((file) => file.section_slug === activeSection.slug);
  const canEdit = payload.requirement.status === 'draft' || payload.requirement.status === 'need_clarification';
  const visibleSections = payload.requirement.status === 'need_clarification' && payload.requirement.clarification_sections.length
    ? sections.filter((section) => payload.requirement.clarification_sections.includes(section.slug))
    : sections;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold">TechAntum Requirement Portal</p>
            <h1 className="text-2xl font-bold mt-1">{payload.project.project_name}</h1>
            <p className="text-sm text-slate-600">{payload.project.company_name}</p>
          </div>
          <div className="min-w-56">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1"><span>Progress</span><span>{progress}%</span></div>
            <div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="lg:sticky lg:top-6 self-start rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600 mb-4">{payload.template.welcome_message}</p>
          <nav className="space-y-1">
            {visibleSections.map((section) => {
              const realIndex = sections.findIndex((item) => item.slug === section.slug);
              const done = completionForSection(section, answers);
              return (
                <button key={section.slug} type="button" onClick={() => setActiveIndex(realIndex)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${activeSection.slug === section.slug ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <span>{done ? '✓' : '○'}</span>
                  {section.title}
                </button>
              );
            })}
          </nav>
        </aside>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Section {activeIndex + 1} of {sections.length}</p>
              <h2 className="text-2xl font-bold">{activeSection.title}</h2>
            </div>
            <div className="text-sm text-slate-500">{saving ? 'Saving...' : lastSaved ? `Last saved ${lastSaved}` : 'Not saved yet'}</div>
          </div>
          {error && <p className="text-sm bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2 rounded-lg">{error}</p>}
          {!canEdit && <p className="text-sm bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg">This requirement has already been submitted.</p>}
          <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-75">
            {activeSection.requirement_questions?.map((question) => (
              <div key={question.id} className="space-y-2">
                <label className="block text-sm font-semibold">{question.label}{question.is_required ? ' *' : ''}</label>
                {renderQuestion(question)}
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="block text-sm font-semibold mb-2">Upload files for this section</label>
              <input multiple type="file" onChange={(e) => Array.from(e.target.files ?? []).forEach((file) => upload(file, activeSection.slug, 'section_upload'))} className="block w-full text-sm" />
              {sectionAttachments.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sectionAttachments.map((file) => <a key={file.id} href={file.public_url} target="_blank" className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 break-all">{file.original_name}</a>)}
                </div>
              )}
            </div>
          </fieldset>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => setActiveIndex(Math.max(activeIndex - 1, 0))} disabled={activeIndex === 0} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">Previous</button>
            <button type="button" onClick={save} disabled={!canEdit || saving} className="rounded-lg border border-indigo-200 text-indigo-700 px-4 py-2 text-sm font-semibold disabled:opacity-50">Save Draft</button>
            <button type="button" onClick={() => setActiveIndex(Math.min(activeIndex + 1, sections.length - 1))} disabled={activeIndex === sections.length - 1} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Next Section</button>
          </div>
          {activeIndex === sections.length - 1 && canEdit && (
            <div className="border-t border-slate-200 pt-5 space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
                <span>I confirm all information is accurate.</span>
              </label>
              <button type="button" onClick={submit} disabled={!confirmed} className="rounded-lg bg-green-700 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Submit Requirements</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
