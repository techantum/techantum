'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import { rememberProject, useYoutubePageBase, yt, metric } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import FieldHint from '@/components/ui/FieldHint';
import PageHeader from '@/components/ui/PageHeader';
import NavIcon from '@/components/ui/NavIcon';
import { useProcess } from '@/components/ui/ProcessOverlay';
import SafeImage from '@/components/ui/SafeImage';
import { enterPlaceholder, nameError, requiredMessage } from '@/lib/forms/rules';

const INDUSTRIES = [
  'Fitness',
  'Beauty',
  'Education',
  'Entertainment',
  'Finance',
  'Food',
  'Gaming',
  'Health',
  'Marketing',
  'Music',
  'News',
  'Real Estate',
  'Technology',
  'Travel',
  'Other',
];

const STEPS = [
  { id: 1, label: 'Project Details' },
  { id: 2, label: 'Your channel' },
];

function FieldIcon({ name, itemKey, delay = 0 }: { name: string; itemKey: string; delay?: number }) {
  return <NavIcon name={name} itemKey={itemKey} delay={delay} className="h-9 w-9 rounded-xl" size={16} />;
}

function CreateHero() {
  return (
    <aside className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#F4ECFF] via-[#EEF2FF] to-[#E8F8FF] p-8 shadow-sm lg:min-h-[640px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: 'linear-gradient(120deg, rgba(124,58,237,.12), rgba(14,165,233,.1), rgba(244,63,94,.08), rgba(124,58,237,.12))',
          backgroundSize: '220% 220%',
          animation: 'create-shimmer 8s ease-in-out infinite alternate',
        }}
      />
      <div className="relative">
        <span
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm"
          style={{ animation: 'create-float 3s ease-in-out infinite' }}
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">▶</span>
          YouTube Research
        </span>
        <h2 className="mt-5 font-bricolage text-3xl font-bold tracking-tight text-slate-900">Turn YouTube insights into real opportunities</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
          Analyse channels, compare content, discover what works and get actionable insights for your business.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-md">
        <div className="absolute -left-4 top-8 h-24 w-24 rounded-full bg-violet-300/40 blur-2xl" style={{ animation: 'create-glow 3.4s ease-in-out infinite' }} />
        <div className="absolute -right-6 bottom-10 h-28 w-28 rounded-full bg-sky-300/40 blur-2xl" style={{ animation: 'create-glow 4s ease-in-out .4s infinite' }} />

        <div className="relative rounded-[28px] border border-white/80 bg-white/80 p-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-1.5 px-1 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-50 p-6">
            <div className="mx-auto flex h-24 w-36 items-center justify-center rounded-2xl bg-white shadow-md">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg" style={{ animation: 'create-glow 2.4s ease-in-out infinite' }}>
                <Icon name="PlayIcon" size={28} />
              </span>
            </div>
            <div className="mt-6 flex h-16 items-end justify-center gap-2">
              {[40, 70, 55, 92, 48, 78].map((height, index) => (
                <span
                  key={height}
                  className="w-3 origin-bottom rounded-full bg-gradient-to-t from-violet-500 to-sky-400"
                  style={{ height: `${height}%`, animation: `create-bar 2.2s ease-in-out ${index * 160}ms infinite` }}
                />
              ))}
            </div>
          </div>
        </div>

        <span className="absolute -left-2 top-16 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-lg" style={{ animation: 'create-float-tilt 3.2s ease-in-out infinite' }}>
          <Icon name="PlayCircleIcon" size={22} />
        </span>
        <span className="absolute -right-3 top-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-lg" style={{ animation: 'create-float 2.8s ease-in-out .2s infinite' }}>
          <Icon name="ChartBarIcon" size={22} />
        </span>
        <span className="absolute right-4 bottom-24 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-lg" style={{ animation: 'create-float 3.6s ease-in-out .5s infinite' }}>
          <Icon name="LightBulbIcon" size={22} />
        </span>
      </div>

      <div className="relative mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { icon: 'BoltIcon', key: 'engagement', title: 'Competitor Analysis', copy: 'Discover winning strategies' },
          { icon: 'ChartBarIcon', key: 'overview', title: 'Content Opportunities', copy: 'Find high-potential topics' },
          { icon: 'ArrowTrendingUpIcon', key: 'restore', title: 'Grow Faster', copy: 'Make data-driven decisions' },
        ].map((item, index) => (
          <div key={item.title} className="rounded-2xl bg-white/80 p-3 text-center shadow-sm">
            <span className="mx-auto mb-2 flex justify-center">
              <NavIcon name={item.icon} itemKey={item.key} delay={index * 180} className="h-9 w-9 rounded-xl" size={16} />
            </span>
            <p className="text-xs font-semibold text-slate-800">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{item.copy}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function ProjectCreateWizard() {
  const router = useRouter();
  const base = useYoutubePageBase();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', objective: '', brand_name: '', industry: '' });
  const [channelInput, setChannelInput] = useState('');
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'fetch' | 'create' | ''>('');
  const [confirming, setConfirming] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string; channel?: string } | null>(null);
  const overlay = useProcess();

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const goChannels = () => {
    setError('');
    if (form.name.trim().length < 2) {
      setError(requiredMessage('project name'));
      return;
    }
    if (!form.objective.trim()) {
      setError(requiredMessage('research objective'));
      return;
    }
    if (form.brand_name.trim() && nameError(form.brand_name, 'brand name')) {
      setError(nameError(form.brand_name, 'brand name'));
      return;
    }
    setStep(2);
  };

  const fetchChannel = async () => {
    if (!channelInput.trim()) {
      setError('Paste your YouTube channel URL, @handle, or channel ID.');
      return;
    }
    setError('');
    setPreview(null);
    setBusy('fetch');
    try {
      await overlay.run('Fetching your channel…', async () => {
        setPreview(await yt('channels/resolve', { method: 'POST', body: JSON.stringify({ input: channelInput.trim() }) }));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch the channel');
    } finally {
      setBusy('');
    }
  };

  const create = async () => {
    if (!preview) {
      setError('Fetch your own YouTube channel before creating the project.');
      setConfirming(false);
      return;
    }
    setBusy('create');
    setError('');
    try {
      await overlay.run('Creating project…', async () => {
        const saved = await yt('projects', {
          method: 'POST',
          body: JSON.stringify({ ...form, status: 'active' }),
        });
        rememberProject(saved.id);
        await yt(`projects/${saved.id}/channels`, {
          method: 'POST',
          body: JSON.stringify({ input: channelInput.trim(), relationship: 'own' }),
        });
        setConfirming(false);
        setCreated({ id: saved.id, name: saved.name || form.name, channel: preview.channelName });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project');
      setConfirming(false);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Create Research Project" backHref={`${base}/projects`} backLabel="Back to projects" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <ol className="mb-8 flex items-center gap-2">
            {STEPS.map((item, index) => {
              const active = step === item.id;
              const done = step > item.id;
              return (
                <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active || done ? 'bg-[#7C3AED] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? <Icon name="CheckIcon" size={16} /> : item.id}
                  </span>
                  <span className={`truncate text-sm font-semibold ${active || done ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
                  {index < STEPS.length - 1 ? <span className={`mx-2 hidden h-px flex-1 sm:block ${done ? 'bg-violet-300' : 'bg-slate-200'}`} /> : null}
                </li>
              );
            })}
          </ol>

          {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <FieldIcon name="PencilSquareIcon" itemKey="profile" />
                <h2 className="inline-flex items-center font-semibold text-slate-900">
                  Project Details
                  <FieldHint text="Give a clear name and objective for your research." />
                </h2>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Project Name <span className="text-rose-500">*</span>
                <FieldHint text="Enter a short project name so you can find this research later." />
                <span className="relative mt-1.5 block">
                  <Icon name="RectangleStackIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${partnerInput} pl-9`} value={form.name} placeholder={enterPlaceholder('project name')} onChange={(event) => set('name', event.target.value)} />
                </span>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Research Objective <span className="text-rose-500">*</span>
                <FieldHint text="Say what you want to learn from this research, in up to 300 characters." />
                <textarea
                  className={`${partnerInput} mt-1.5 min-h-[7rem] resize-none`}
                  maxLength={300}
                  value={form.objective}
                  placeholder={enterPlaceholder('research objective')}
                  onChange={(event) => set('objective', event.target.value)}
                />
                <span className="mt-1 block text-right text-xs text-slate-400">{form.objective.length}/300</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Client / Brand Name
                  <FieldHint text="Letters, spaces, hyphens or apostrophes only." />
                  <span className="relative mt-1.5 block">
                    <Icon name="BuildingOffice2Icon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={`${partnerInput} pl-9`} value={form.brand_name} placeholder={enterPlaceholder('brand name')} onChange={(event) => set('brand_name', event.target.value)} />
                  </span>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Industry
                  <span className="relative mt-1.5 block">
                    <Icon name="BriefcaseIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select className={`${partnerInput} pl-9`} value={form.industry} onChange={(event) => set('industry', event.target.value)}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link href={base} className={partnerBtnSecondary}>Cancel</Link>
                <button type="button" className={partnerBtnPrimary} onClick={goChannels}>
                  Next: Your channel →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <FieldIcon name="PlayCircleIcon" itemKey="youtube" />
                <h2 className="inline-flex items-center font-semibold text-slate-900">
                  Connect your own channel
                  <FieldHint text="Self setup for the brand you own. Add competitors later from Research — not on this step." />
                </h2>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Your YouTube channel <span className="text-rose-500">*</span>
                <span className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <span className="relative block flex-1">
                    <Icon name="LinkIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className={`${partnerInput} pl-9`}
                      value={channelInput}
                      placeholder={enterPlaceholder('YouTube channel URL or @handle')}
                      onChange={(event) => { setChannelInput(event.target.value); setPreview(null); }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void fetchChannel();
                        }
                      }}
                    />
                  </span>
                  <button type="button" className={partnerBtnPrimary} disabled={busy === 'fetch'} onClick={() => void fetchChannel()}>
                    {busy === 'fetch' ? 'Fetching…' : 'Fetch channel'}
                  </button>
                </span>
              </label>

              {preview ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3">
                  {preview.thumbnailUrl ? (
                    <SafeImage
                      src={preview.thumbnailUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                      fallback={<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500">{String(preview.channelName || 'C').slice(0, 1).toUpperCase()}</span>}
                    />
                  ) : (
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500">{String(preview.channelName || 'C').slice(0, 1).toUpperCase()}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{preview.channelName}</p>
                    <p className="text-sm text-slate-500">
                      {preview.channelHandle ? `@${String(preview.channelHandle).replace(/^@/, '')}` : preview.youtubeChannelId} · {metric(preview.subscriberCount)} subscribers
                    </p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-violet-600">Own channel</p>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Paste your channel, fetch it, then create. Competitor channels are added after the project exists.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={partnerBtnSecondary} onClick={() => { setError(''); setStep(1); }}>Back</button>
                <button
                  type="button"
                  className={partnerBtnPrimary}
                  disabled={!preview}
                  onClick={() => { setError(''); setConfirming(true); }}
                >
                  Create project
                </button>
              </div>
            </div>
          )}
        </section>

        <CreateHero />
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <span className="mb-3 inline-flex">
              <NavIcon name="CheckCircleIcon" itemKey="select" className="h-11 w-11 rounded-2xl" size={22} />
            </span>
            <h2 className="font-bricolage text-xl font-semibold text-slate-900">Create this project?</h2>
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{form.name}</span> will be created as active, with <span className="font-semibold text-slate-800">{preview?.channelName}</span> as your own channel. Competitors are not added here.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={partnerBtnSecondary} disabled={busy === 'create'} onClick={() => setConfirming(false)}>Cancel</button>
              <button type="button" className={partnerBtnPrimary} disabled={busy === 'create'} onClick={() => void create()}>
                {busy === 'create' ? 'Creating…' : 'Yes, create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {created ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]" role="status">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" style={{ animation: 'create-glow 1.8s ease-in-out infinite' }}>
              <Icon name="CheckIcon" size={32} />
            </span>
            <h2 className="font-bricolage text-2xl font-semibold text-slate-900">Project created</h2>
            <p className="mt-2 text-sm text-slate-500">
              {created.name} is ready. {created.channel ? `${created.channel} is connected as your own channel.` : 'Open Research to add competitors and fetch videos.'}
            </p>
            <button
              type="button"
              className={`${partnerBtnPrimary} mt-6`}
              onClick={() => router.push(`${base}/videos`)}
            >
              Open Research
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
