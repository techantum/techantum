'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminButton from '@/components/admin/AdminButton';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import Icon from '@/components/ui/AppIcon';
import { partnerBtnSecondary } from '@/components/partner/PartnerUi';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import { PRIMARY_GOALS } from '@/lib/youtube/analysis-display';

const AGES = ['All ages', '13–17', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
const GENDERS = ['All audiences', 'Male', 'Female'];
const DEVICES = ['All devices', 'Mobile', 'Desktop', 'TV'];
const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];
const GEOS = ['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Singapore', 'Australia'];

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function toggleExclusive(list: string[], id: string, allId: string) {
  if (id === allId) return [allId];
  const next = list.includes(id) ? list.filter((item) => item !== id && item !== allId) : [...list.filter((item) => item !== allId), id];
  return next.length ? next : [allId];
}

export type AnalyseConfig = {
  goals: string[];
  primaryGoal: string;
  targetAges: string[];
  targetGenders: string[];
  geographies: string[];
  languages: string[];
  interests: string[];
  devices: string[];
  audienceNotes: string;
};

export default function AnalyseModal({
  videos,
  busy,
  error,
  variant = 'insights',
  onClose,
  onGenerate,
}: {
  videos: Record<string, any>[];
  busy: boolean;
  error?: string;
  variant?: 'direct' | 'insights';
  onClose: () => void;
  onGenerate: (config: AnalyseConfig) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [primaryGoal, setPrimaryGoal] = useState('views');
  const [secondary, setSecondary] = useState<string[]>([]);
  const goals = [primaryGoal, ...secondary.filter((item) => item !== primaryGoal)];
  const [ages, setAges] = useState<string[]>(['All ages']);
  const [genders, setGenders] = useState<string[]>(['All audiences']);
  const [geographies, setGeographies] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>(['All devices']);
  const [notes, setNotes] = useState('');
  const [interestDraft, setInterestDraft] = useState('');
  const [localError, setLocalError] = useState('');

  const goalRows = useMemo(() => PRIMARY_GOALS.filter((item) => goals.includes(item.id)), [goals]);
  const started = useRef(false);

  useEffect(() => {
    if (variant !== 'direct' || started.current) return;
    started.current = true;
    onGenerate({
      goals: ['views'],
      primaryGoal: 'views',
      targetAges: ['All ages'],
      targetGenders: ['All audiences'],
      geographies: [],
      languages: [],
      interests: [],
      devices: ['All devices'],
      audienceNotes: '',
    });
  }, [onGenerate, variant]);

  const goReview = () => {
    if (!goals.length) {
      setLocalError('Select at least one objective.');
      return;
    }
    setLocalError('');
    setStep(3);
  };

  const generate = () => {
    if (!goals.length) {
      setLocalError('Select at least one objective.');
      return;
    }
    onGenerate({
      goals,
      primaryGoal,
      targetAges: ages,
      targetGenders: genders,
      geographies,
      languages,
      interests,
      devices,
      audienceNotes: notes,
    });
  };

  if (busy || variant === 'direct') {
    return (
      <FetchVideosOverlay
        mode="analysis"
        title={variant === 'insights' ? 'Please wait while we generate key insights' : 'Please wait while we run the analysis'}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="analyse-title">
      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-[fadeIn_.2s_ease-out]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {step} of 3</p>
                <h2 id="analyse-title" className="font-bricolage text-xl font-semibold text-slate-900">
                  {step === 1 ? 'Insight goals' : step === 2 ? 'Audience (optional)' : 'Review key insights'}
                </h2>
                <p className="text-sm text-slate-500">Pick one primary objective. Optionally add up to two secondary goals. YouTube Master will route diagnosis to the matching playbooks.</p>
              </div>
              <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={onClose} aria-label="Close">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {localError || error ? <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{localError || error}</p> : null}

              {step === 1 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PRIMARY_GOALS.map((item) => {
                    const isPrimary = primaryGoal === item.id;
                    const isSecondary = secondary.includes(item.id);
                    const on = isPrimary || isSecondary;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setLocalError('');
                          if (isPrimary) return;
                          if (isSecondary) {
                            setSecondary(secondary.filter((id) => id !== item.id));
                            return;
                          }
                          if (secondary.length >= 2) {
                            setSecondary([...secondary.slice(1), item.id]);
                            return;
                          }
                          setSecondary([...secondary, item.id]);
                        }}
                        onDoubleClick={() => {
                          setLocalError('');
                          setSecondary(secondary.filter((id) => id !== item.id).concat(primaryGoal === item.id ? [] : [primaryGoal]).slice(0, 2));
                          setPrimaryGoal(item.id);
                        }}
                        className={`rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-sm ${isPrimary ? 'border-orange-300 bg-orange-50 shadow-sm' : isSecondary ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-white'}`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${on ? 'bg-white text-secondary' : 'bg-slate-50 text-slate-400'}`}>
                            <Icon name={item.icon} size={20} />
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isPrimary ? 'bg-secondary text-white' : isSecondary ? 'bg-violet-200 text-violet-800' : 'bg-slate-100 text-slate-400'}`}>
                            {isPrimary ? 'Primary' : isSecondary ? 'Secondary' : 'Off'}
                          </span>
                        </span>
                        <span className="mt-3 block font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-1 block text-xs text-slate-500">{item.hint}</span>
                        {'playbooks' in item ? <span className="mt-2 block text-[11px] text-slate-400">Playbooks: {item.playbooks}</span> : null}
                      </button>
                    );
                  })}
                  <p className="sm:col-span-2 lg:col-span-3 text-xs text-slate-500">Click to add a secondary goal. Double-click to make a goal primary. Keep one primary.</p>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Target age group</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {AGES.map((item) => (
                        <button key={item} type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${ages.includes(item) ? 'border-orange-300 bg-orange-50 text-secondary' : 'border-slate-200 text-slate-600'}`} onClick={() => setAges(toggleExclusive(ages, item, 'All ages'))}>{item}</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Target gender</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {GENDERS.map((item) => (
                        <button key={item} type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${genders.includes(item) ? 'border-orange-300 bg-orange-50 text-secondary' : 'border-slate-200 text-slate-600'}`} onClick={() => setGenders(toggleExclusive(genders, item, 'All audiences'))}>{item}</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Target geography</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {GEOS.map((item) => (
                        <button key={item} type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${geographies.includes(item) ? 'border-orange-300 bg-orange-50 text-secondary' : 'border-slate-200 text-slate-600'}`} onClick={() => setGeographies(toggle(geographies, item))}>{item}</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Target language</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {LANGUAGES.map((item) => (
                        <button key={item} type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${languages.includes(item) ? 'border-orange-300 bg-orange-50 text-secondary' : 'border-slate-200 text-slate-600'}`} onClick={() => setLanguages(toggle(languages, item))}>{item}</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Audience interests</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {interests.map((item) => (
                        <span key={item} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-secondary">
                          {item}
                          <button type="button" onClick={() => setInterests(interests.filter((value) => value !== item))}>×</button>
                        </span>
                      ))}
                      <input
                        className="min-w-[10rem] flex-1 border-0 text-sm outline-none"
                        placeholder="Enter audience interest"
                        value={interestDraft}
                        onChange={(event) => setInterestDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const next = interestDraft.trim();
                            if (next && !interests.includes(next)) setInterests([...interests, next].slice(0, 12));
                            setInterestDraft('');
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Device type</p>
                    <p className="mt-1 text-xs text-slate-400">Desired target only. Device split is not in the public Data API.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {DEVICES.map((item) => (
                        <button key={item} type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${devices.includes(item) ? 'border-orange-300 bg-orange-50 text-secondary' : 'border-slate-200 text-slate-600'}`} onClick={() => setDevices(toggleExclusive(devices, item, 'All devices'))}>{item}</button>
                      ))}
                    </div>
                  </div>
                  <label className="lg:col-span-2 rounded-2xl border border-slate-200 p-4 text-sm">
                    <span className="font-semibold text-slate-800">Target audience notes</span>
                    <textarea className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Enter notes about this analysis" />
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <article className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Objectives</p>
                      <button type="button" className="text-xs font-semibold text-secondary" onClick={() => setStep(1)}>Edit</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {goalRows.map((item) => (
                        <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-secondary">
                          <Icon name={item.icon} size={14} /> {item.label}
                        </span>
                      ))}
                    </div>
                  </article>
                  <article className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold">Selected videos ({videos.length})</p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {videos.map((video) => (
                        <li key={video.id} className="flex gap-2 rounded-xl border border-slate-100 p-2">
                          <span className="h-12 w-[4.5rem] overflow-hidden rounded-lg bg-slate-100">
                            <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-xs font-semibold text-slate-800">{video.title || video.youtube_video_id}</span>
                            <span className="text-[11px] text-slate-400">{video.relationship === 'own' ? 'You' : 'Comp'}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                  <article className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">Audience</p>
                      <button type="button" className="text-xs font-semibold text-secondary" onClick={() => setStep(2)}>Edit</button>
                    </div>
                    <p className="mt-2">{[ages.join(', '), genders.join(', '), geographies.join(', ') || 'Any geography', languages.join(', ') || 'Any language'].join(' · ')}</p>
                  </article>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" className={partnerBtnSecondary} onClick={onClose}>Cancel</button>
              <div className="flex gap-2">
                {step > 1 ? <AdminButton onClick={() => setStep((step - 1) as 1 | 2 | 3)}>Back</AdminButton> : null}
                {step === 1 ? <AdminButton variant="primary" onClick={() => { if (!goals.length) { setLocalError('Select at least one objective.'); return; } setLocalError(''); setStep(2); }}>Next: Audience</AdminButton> : null}
                {step === 2 ? <AdminButton variant="primary" onClick={goReview}>Next: Review</AdminButton> : null}
                {step === 3 ? <AdminButton variant="primary" onClick={generate}><Icon name="SparklesIcon" size={16} /> Generate key insights</AdminButton> : null}
              </div>
            </div>
      </div>
    </div>
  );
}
