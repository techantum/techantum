'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import GapCards from '@/components/admin/youtube/GapCards';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { buildGapCards } from '@/lib/youtube/gap-cards';
import { metric, useProjectId, yt } from '@/components/admin/youtube/YoutubeFrame';
import Icon from '@/components/ui/AppIcon';
import type { ResearchFilterOptions } from '@/components/admin/youtube/research-ui';

const STEPS = [
  { id: 1, title: 'Goal & Focus', hint: 'What do you want to achieve?' },
  { id: 2, title: 'Select Content', hint: 'Choose channels and videos' },
  { id: 3, title: 'Audience (Optional)', hint: 'Define target audience' },
  { id: 4, title: 'Review & Generate', hint: 'Confirm and run analysis' },
];

const PRIMARY_GOALS = [
  { id: 'views', label: 'Increase Views', hint: 'Improve reach and visibility', icon: 'ChartBarIcon' },
  { id: 'likes', label: 'Increase Likes', hint: 'Get more likes on videos', icon: 'HeartIcon' },
  { id: 'comments', label: 'More Comments', hint: 'Drive meaningful discussions', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'engagement', label: 'Higher Engagement', hint: 'Improve overall interaction', icon: 'UserGroupIcon' },
  { id: 'retention', label: 'Improve Retention', hint: 'Keep viewers watching longer', icon: 'ClockIcon' },
  { id: 'discoverability', label: 'Better Discoverability', hint: 'Rank higher in search and suggested', icon: 'MagnifyingGlassIcon' },
];

const FOCUS = [
  { id: 'titles', label: 'Titles', hint: 'Improve title clarity and SEO', icon: 'Bars3BottomLeftIcon' },
  { id: 'thumbnails', label: 'Thumbnails', hint: 'Get thumbnail suggestions', icon: 'PhotoIcon' },
  { id: 'descriptions', label: 'Descriptions', hint: 'Optimize descriptions and tags', icon: 'DocumentTextIcon' },
  { id: 'content_ideas', label: 'Content Ideas', hint: 'Discover new topic opportunities', icon: 'LightBulbIcon' },
  { id: 'publishing', label: 'Publishing Strategy', hint: 'Best time, frequency and format', icon: 'CalendarDaysIcon' },
  { id: 'competitor_insights', label: 'Competitor Insights', hint: 'Learn from top-performing videos', icon: 'PresentationChartLineIcon' },
];

const AGES = ['All ages', '13–17', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
const GENDERS = ['All audiences', 'Male', 'Female'];
const DEVICES = ['All devices', 'Mobile', 'Desktop', 'TV'];
const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];
const GEOS = ['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Singapore', 'Australia'];
const STATUSES = ['proposed', 'approved', 'in_progress', 'implemented', 'under_review', 'completed', 'rejected'];

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function toggleExclusive(list: string[], id: string, allId: string) {
  if (id === allId) return [allId];
  const next = list.includes(id) ? list.filter((item) => item !== id && item !== allId) : [...list.filter((item) => item !== allId), id];
  return next.length ? next : [allId];
}

function compact(value: unknown) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return number.toLocaleString('en-IN');
}

function Chip({ on, children, onClick }: { on?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${on ? 'border-orange-300 bg-orange-50 text-secondary' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? 'border-secondary bg-secondary text-white' : 'border-slate-300 bg-white'}`}>
        {on ? <Icon name="CheckIcon" size={10} /> : null}
      </span>
      {children}
    </button>
  );
}

function TagField({
  label,
  hint,
  icon,
  values,
  suggestions,
  placeholder,
  onChange,
}: {
  label: string;
  hint: string;
  icon: string;
  values: string[];
  suggestions: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = (value: string) => {
    const next = value.trim();
    if (!next || values.includes(next)) return;
    onChange([...values, next].slice(0, 12));
    setDraft('');
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon name={icon} size={16} className="text-slate-400" /> {label}
      </p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-200 px-2 py-2">
        {values.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-secondary">
            {item}
            <button type="button" onClick={() => onChange(values.filter((value) => value !== item))} aria-label={`Remove ${item}`}>×</button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 border-0 p-1 text-sm outline-none"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add(draft);
            }
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.filter((item) => !values.includes(item)).slice(0, 6).map((item) => (
          <button key={item} type="button" className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100" onClick={() => add(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AiAnalysisWizard() {
  const projectId = useProjectId();
  const search = useSearchParams();
  const [step, setStep] = useState(1);
  const [screen, setScreen] = useState<'list' | 'wizard' | 'results'>('list');
  const [goals, setGoals] = useState<string[]>(['views']);
  const [focus, setFocus] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, any>>({});
  const [ages, setAges] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>(['All audiences']);
  const [geographies, setGeographies] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>(['All devices']);
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');
  const [topicId, setTopicId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includeShorts, setIncludeShorts] = useState(true);
  const [videos, setVideos] = useState<Record<string, any>[]>([]);
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [options, setOptions] = useState<ResearchFilterOptions>({});
  const [history, setHistory] = useState<Record<string, any>[]>([]);
  const [current, setCurrent] = useState<Record<string, any> | null>(null);
  const [openCard, setOpenCard] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState('');

  const loadVideos = async () => {
    const params = new URLSearchParams({ page: '1', pageSize: '80', sort: 'view_count', q, topicId, categoryId, from, to, content: includeShorts ? '' : 'video' });
    const body = await yt(`projects/${projectId}/videos?${params}`);
    setVideos(body.rows || []);
  };

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      yt(`projects/${projectId}/channels`),
      yt(`projects/${projectId}/filters`),
      yt(`projects/${projectId}/ai-analyses`),
    ]).then(async ([channelRows, filterRows, analysisRows]) => {
      setChannels(channelRows || []);
      setOptions(filterRows || {});
      setHistory(analysisRows || []);
      const openId = search?.get('id');
      if (openId) {
        setCurrent(await yt(`projects/${projectId}/ai-analyses/${openId}`));
        setScreen('results');
      } else if (search?.get('custom') === '1') {
        setScreen('wizard');
      } else {
        setScreen('list');
      }
    }).catch((err) => setError(err.message)).finally(() => setReady(true));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || step !== 2) return;
    loadVideos().catch((err) => setError(err.message));
  }, [projectId, step, q, topicId, categoryId, from, to, includeShorts]);

  const videoIds = Object.keys(picked);
  const setVideoIds = (ids: string[], catalog: Record<string, any>[] = videos) => {
    const next: Record<string, any> = {};
    ids.forEach((id) => {
      const row = picked[id] || catalog.find((video) => video.id === id);
      if (row) next[id] = row;
    });
    setPicked(next);
  };
  const ownChannels = channels.filter((channel) => channel.relationship === 'own');
  const competitorChannels = channels.filter((channel) => channel.relationship !== 'own');
  const selectedVideos = Object.values(picked);
  const ownSelected = selectedVideos.filter((video) => video.relationship === 'own').length;
  const competitorSelected = selectedVideos.length - ownSelected;
  const topicSuggestions = (options.topics || []).map((topic) => topic.name).concat((options.tags || []).map((item) => item.tag)).filter(Boolean);

  const grouped = (list: Record<string, any>[]) => list.map((channel) => ({
    channel,
    videos: videos.filter((video) => video.channel_id === channel.id),
  })).filter((group) => group.videos.length || list.length);

  const nextFromStep1 = () => {
    if (!goals.length) {
      setError('Select at least one primary goal.');
      return;
    }
    setError('');
    setStep(2);
  };

  const nextFromStep2 = () => {
    if (!videoIds.length) {
      setError('Select at least one video to analyse.');
      return;
    }
    setError('');
    setStep(3);
  };

  const generate = async () => {
    try {
      setBusy(true);
      setError('');
      const body = await yt(`projects/${projectId}/ai-analyses`, {
        method: 'POST',
        body: JSON.stringify({
          goals,
          source: 'selected',
          videoIds,
          contentFocus: focus,
          targetAges: ages,
          targetGenders: genders,
          geographies,
          languages,
          interests,
          devices,
          audienceNotes: notes,
          outputs: ['improve_existing', 'new_ideas', 'gap_report'],
        }),
      });
      setCurrent(body);
      setHistory(await yt(`projects/${projectId}/ai-analyses`));
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate analysis');
    } finally {
      setBusy(false);
    }
  };

  const openAnalysis = async (id: string) => {
    setOpening(id);
    try {
      setCurrent(await yt(`projects/${projectId}/ai-analyses/${id}`));
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open analysis');
    } finally {
      setOpening('');
    }
  };

  const saveAction = async (id: string, status: string) => {
    try {
      await yt(`projects/${projectId}/ai-actions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (current?.id) setCurrent(await yt(`projects/${projectId}/ai-analyses/${current.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update action');
    }
  };

  const resetFilters = () => {
    setQ('');
    setTopicId('');
    setCategoryId('');
    setFrom('');
    setTo('');
    setIncludeShorts(true);
  };

  const preview = useMemo(() => {
    const cards = [
      { show: goals.includes('views') || goals.includes('discoverability') || focus.includes('content_ideas'), icon: 'PlayCircleIcon', title: 'Identify high-performing topics', body: 'Find topics that get more views and why they perform well.' },
      { show: goals.length > 0, icon: 'PresentationChartBarIcon', title: 'Compare with competitors', body: 'See what your competitors are doing differently in titles, thumbnails and content.' },
      { show: true, icon: 'LightBulbIcon', title: 'Get actionable recommendations', body: 'Receive specific suggestions to improve your existing videos.' },
      { show: focus.includes('content_ideas') || goals.includes('views'), icon: 'ClipboardDocumentCheckIcon', title: 'Content ideas for future uploads', body: 'Discover new topics with high potential based on trending and competitor content.' },
    ];
    return cards.filter((card) => card.show).slice(0, 4);
  }, [goals, focus]);

  const result = current?.result || {};
  const observations = Array.isArray(result.observations) ? result.observations : [];
  const alternatives = result.alternatives || {};
  const gapPair = buildGapCards(current?.evidence?.videos || []);
  const evidenceVideos: Record<string, any>[] = current?.evidence?.videos || [];
  const videoMap = Object.fromEntries(evidenceVideos.map((video) => [video.id, video]));
  const goalLabels = PRIMARY_GOALS.filter((item) => goals.includes(item.id));
  const focusLabels = FOCUS.filter((item) => focus.includes(item.id));

  if (!ready && !error) return <PageLoader label="Loading AI analysis…" />;

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {busy ? <PageLoader label="Generating analysis…" /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 font-bricolage text-xl font-semibold text-slate-900">
            <Icon name="SparklesIcon" size={20} className="text-secondary" /> AI Analysis
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {screen === 'list'
              ? 'Open a saved analysis or run a custom AI analysis for a deeper comparison.'
              : 'Set your goals, choose content, define audience and generate an evidence-based analysis.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {screen !== 'list' ? (
            <AdminButton onClick={() => setScreen('list')}>
              <Icon name="QueueListIcon" size={16} /> All analyses
            </AdminButton>
          ) : null}
          <AdminButton variant="primary" onClick={() => { setStep(1); setScreen('wizard'); setCurrent(null); }}>
            <Icon name="SparklesIcon" size={16} /> Custom AI analysis
          </AdminButton>
        </div>
      </div>

      {screen === 'list' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                {['Analysis', 'Status', 'Created', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length ? history.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3"><AdminBadge variant={row.status === 'ready' ? 'green' : row.status === 'failed' ? 'rose' : 'default'}>{row.status}</AdminBadge></td>
                  <td className="px-4 py-3 text-slate-500">{String(row.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3">
                    <AdminButton size="sm" loading={opening === row.id} onClick={() => openAnalysis(row.id)}>View details</AdminButton>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-10 text-sm text-slate-500" colSpan={4}>
                    No analyses yet. Select videos on the Videos page and click Generate Summary, or start a custom AI analysis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      {screen === 'wizard' ? (
        <>
          <ol className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:grid-cols-4">
            {STEPS.map((item) => {
              const done = step > item.id;
              const active = step === item.id;
              return (
                <li key={item.id} className={`flex items-center gap-3 rounded-xl px-2 py-1 ${active ? 'text-secondary' : done ? 'text-slate-800' : 'text-slate-400'}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active || done ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {done ? <Icon name="CheckIcon" size={16} /> : item.id}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="block text-[11px] text-slate-400">{item.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          {step === 1 ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 1 of 4</p>
                <h3 className="mt-1 font-bricolage text-2xl font-semibold text-slate-900">Goal & Focus</h3>
                <p className="mt-1 text-sm text-slate-500">Select one or more goals to get relevant insights and recommendations.</p>
                <h4 className="mt-5 text-sm font-semibold text-slate-800">Primary goals</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PRIMARY_GOALS.map((item) => {
                    const on = goals.includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => setGoals(toggle(goals, item.id))} className={`rounded-2xl border p-4 text-left ${on ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <span className="flex items-start justify-between gap-2">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'bg-white text-secondary' : 'bg-slate-50 text-slate-500'}`}>
                            <Icon name={item.icon} size={18} />
                          </span>
                          <span className={`flex h-5 w-5 items-center justify-center rounded ${on ? 'bg-secondary text-white' : 'border border-slate-300'}`}>
                            {on ? <Icon name="CheckIcon" size={12} /> : null}
                          </span>
                        </span>
                        <span className="mt-3 block text-sm font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span>
                      </button>
                    );
                  })}
                </div>
                <h4 className="mt-6 text-sm font-semibold text-slate-800">Content focus (optional)</h4>
                <p className="mt-1 text-xs text-slate-400">Select the areas you want recommendations for.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FOCUS.map((item) => {
                    const on = focus.includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => setFocus(toggle(focus, item.id))} className={`rounded-2xl border p-4 text-left ${on ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <span className="flex items-start justify-between gap-2">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'bg-white text-secondary' : 'bg-slate-50 text-slate-500'}`}>
                            <Icon name={item.icon} size={18} />
                          </span>
                          <span className={`h-4 w-4 rounded border ${on ? 'border-secondary bg-secondary' : 'border-slate-300'}`} />
                        </span>
                        <span className="mt-3 block text-sm font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span>
                      </button>
                    );
                  })}
                </div>
                <details className="mt-5 rounded-2xl bg-slate-50 px-4 py-3" open>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Analysis will include</summary>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Comparison with selected competitor channels</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Content gaps and opportunities</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Actionable recommendations for existing and new videos</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Prioritized improvement plan</li>
                  </ul>
                </details>
              </section>
              <aside className="space-y-3">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-slate-700">
                  <p className="inline-flex items-center gap-2 font-semibold text-secondary"><Icon name="LightBulbIcon" size={16} /> You can select multiple goals.</p>
                  <p className="mt-1 text-xs leading-5">The analysis will provide insights and recommendations based on your selected goals.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">Analysis preview</p>
                  <p className="mt-0.5 text-xs text-slate-400">Example insights for the selected goal(s)</p>
                  <div className="mt-3 space-y-3">
                    {preview.map((card) => (
                      <div key={card.title} className="flex gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-secondary">
                          <Icon name={card.icon} size={18} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{card.title}</span>
                          <span className="block text-xs leading-5 text-slate-500">{card.body}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold">Next: You will select channels and videos to analyse based on the goals you choose.</p>
                </div>
              </aside>
            </div>
          ) : null}

          {step === 2 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 2 of 4</p>
                  <h3 className="mt-1 font-bricolage text-2xl font-semibold text-slate-900">Select content</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose videos from your channel and competitor channels to analyse.</p>
                </div>
                <div className="flex gap-2">
                  <AdminButton onClick={() => setStep(1)}>← Back</AdminButton>
                  <AdminButton variant="primary" onClick={nextFromStep2}>Next: Audience →</AdminButton>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="relative min-w-[16rem] flex-1">
                  <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                  <input className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm" placeholder="Search title, description or tags..." value={q} onChange={(event) => setQ(event.target.value)} />
                </label>
                <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={topicId} onChange={(event) => setTopicId(event.target.value)}>
                  <option value="">All topics</option>
                  {(options.topics || []).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
                <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">All categories</option>
                  {(options.categories || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <input type="date" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={from} onChange={(event) => setFrom(event.target.value)} />
                <input type="date" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={to} onChange={(event) => setTo(event.target.value)} />
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300 text-secondary" checked={includeShorts} onChange={(event) => setIncludeShorts(event.target.checked)} />
                  Include Shorts
                </label>
                <button type="button" className="text-sm font-semibold text-slate-500" onClick={resetFilters}>Reset</button>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {[...grouped(ownChannels), ...grouped(competitorChannels)].map(({ channel, videos: rows }) => {
                  const ids = rows.map((video) => video.id);
                  const allOn = ids.length > 0 && ids.every((id) => videoIds.includes(id));
                  const own = channel.relationship === 'own';
                  return (
                    <article key={channel.id} className="rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-slate-100" />}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{channel.channel_name || channel.youtube_channel_id}</p>
                            <p className="text-xs text-slate-400">{channel.videos_imported || rows.length} videos</p>
                          </div>
                          <AdminBadge variant={own ? 'indigo' : 'default'}>{own ? 'Own Channel' : 'Competitor'}</AdminBadge>
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                          <input type="checkbox" checked={allOn} onChange={() => setVideoIds(allOn ? videoIds.filter((id) => !ids.includes(id)) : [...new Set([...videoIds, ...ids])].slice(0, 40))} />
                          Select all
                        </label>
                      </div>
                      <div className="max-h-[28rem] divide-y divide-slate-100 overflow-auto">
                        {rows.map((video) => {
                          const on = videoIds.includes(video.id);
                          return (
                            <label key={video.id} className="flex cursor-pointer items-start gap-3 px-4 py-3">
                              <input type="checkbox" className="mt-3 rounded border-slate-300 text-secondary" checked={on} onChange={() => setVideoIds(toggle(videoIds, video.id).slice(0, 40))} />
                              <span className="relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                                {video.duration_label ? <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold text-white">{video.duration_label}</span> : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold leading-5 text-slate-900">{video.title || video.youtube_video_id}</span>
                                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>{video.published_at ? String(video.published_at).slice(0, 10) : '—'}</span>
                                  <span>{compact(video.view_count)}</span>
                                  <span>{compact(video.like_count)}</span>
                                  {video.topic_name ? <AdminBadge variant="sky">{video.topic_name}</AdminBadge> : null}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                        {!rows.length ? <p className="px-4 py-8 text-sm text-slate-500">No imported videos match these filters.</p> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
                <p><span className="font-semibold">{videoIds.length} videos selected</span> ({ownSelected} from own channel, {competitorSelected} from competitor channels)</p>
                <button type="button" className="font-semibold" onClick={() => setVideoIds([])}>Clear selection</button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 3 of 4</p>
                <h3 className="font-bricolage text-2xl font-semibold text-slate-900">Audience (Optional)</h3>
                <p className="text-sm text-slate-500">Define your target audience to get more relevant insights and recommendations.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Target Age Group</p>
                    <p className="mt-1 text-xs text-slate-400">Select the primary age group for your target audience.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {AGES.map((item) => <Chip key={item} on={ages.includes(item)} onClick={() => setAges(toggleExclusive(ages, item, 'All ages'))}>{item}</Chip>)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Target Gender</p>
                    <p className="mt-1 text-xs text-slate-400">Select the primary gender for your target audience.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {GENDERS.map((item) => <Chip key={item} on={genders.includes(item)} onClick={() => setGenders(toggleExclusive(genders, item, 'All audiences'))}>{item}</Chip>)}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TagField label="Target Geography" hint="Select countries or regions." icon="MapPinIcon" values={geographies} suggestions={GEOS} placeholder="Select countries or regions" onChange={setGeographies} />
                  <TagField label="Target Language" hint="Select preferred language for your target audience." icon="LanguageIcon" values={languages} suggestions={LANGUAGES} placeholder="Select languages" onChange={setLanguages} />
                  <TagField label="Audience Interests (Optional)" hint="Add relevant interests or keywords (e.g. health, fitness, surgery)." icon="TagIcon" values={interests} suggestions={topicSuggestions} placeholder="Add interests" onChange={setInterests} />
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Device Type (Optional)</p>
                    <p className="mt-1 text-xs text-slate-400">Select device types to analyse performance.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {DEVICES.map((item) => <Chip key={item} on={devices.includes(item)} onClick={() => setDevices(toggleExclusive(devices, item, 'All devices'))}>{item}</Chip>)}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Device split is a desired target until authorized YouTube Analytics is connected.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">Target Audience Notes (Optional)</p>
                  <p className="mt-1 text-xs text-slate-400">Add any specific audience notes, such as patient type, profession, or location details.</p>
                  <textarea className="mt-3 h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Patients looking for treatment information in Telugu, aged 25–44." />
                  <p className="mt-1 text-right text-xs text-slate-400">{notes.length}/500</p>
                </div>
              </section>
              <aside className="space-y-3">
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
                  These are desired audience targets. Actual audience insights are available only when an authorized YouTube channel is connected.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">How this helps</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Get audience-focused insights for the selected goals.</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Better recommendations for titles, thumbnails and topics.</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Plan future content for the selected audience.</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Compare with competitors using similar public content.</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-semibold text-slate-800">Current Selection Summary</p>
                  <dl className="mt-3 space-y-1 text-slate-600">
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Age Group</dt><dd>{ages.join(', ') || '—'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Gender</dt><dd>{genders.join(', ')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Geography</dt><dd>{geographies.join(', ') || '—'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Language</dt><dd>{languages.join(', ') || '—'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Interests</dt><dd>{interests.join(', ') || '—'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Device Type</dt><dd>{devices.join(', ')}</dd></div>
                  </dl>
                </div>
              </aside>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 4 of 4</p>
                <h3 className="font-bricolage text-2xl font-semibold text-slate-900">Review & Generate</h3>
                <p className="text-sm text-slate-500">Check your selections and settings. Once you start, AI will analyse the videos and generate insights and recommendations.</p>
                <article className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Analysis goals</p>
                    <button type="button" className="text-xs font-semibold text-secondary" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {goalLabels.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-secondary"><Icon name={item.icon} size={14} /> {item.label}</span>)}
                    {focusLabels.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><Icon name={item.icon} size={14} /> {item.label}</span>)}
                  </div>
                </article>
                <article className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Selected videos ({videoIds.length})</p>
                    <button type="button" className="text-xs font-semibold text-secondary" onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {selectedVideos.slice(0, 8).map((video) => (
                      <div key={video.id} className="overflow-hidden rounded-xl border border-slate-100">
                        <span className="relative block aspect-video bg-slate-100">
                          {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                          {video.duration_label ? <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold text-white">{video.duration_label}</span> : null}
                        </span>
                        <p className="line-clamp-2 px-2 pt-2 text-xs font-semibold text-slate-800">{video.title || video.youtube_video_id}</p>
                        <p className="px-2 pb-2 text-[11px] text-slate-500">{video.relationship === 'own' ? 'Own' : 'Competitor'} · {compact(video.view_count)}</p>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Audience settings (Optional)</p>
                    <button type="button" className="text-xs font-semibold text-secondary" onClick={() => setStep(3)}>Edit</button>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs text-slate-400">Age group</dt><dd>{ages.join(', ') || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-400">Gender</dt><dd>{genders.join(', ')}</dd></div>
                    <div><dt className="text-xs text-slate-400">Geography</dt><dd>{geographies.join(', ') || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-400">Language</dt><dd>{languages.join(', ') || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-400">Interests</dt><dd>{interests.join(', ') || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-400">Device type</dt><dd>{devices.join(', ')}</dd></div>
                  </dl>
                </article>
                {notes ? (
                  <article className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Additional notes (Optional)</p>
                    <p className="mt-2 text-sm text-slate-600">{notes}</p>
                  </article>
                ) : null}
              </section>
              <aside className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-semibold text-slate-800">Analysis summary</p>
                  <dl className="mt-3 space-y-2 text-slate-600">
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Total videos</dt><dd>{videoIds.length} ({ownSelected} own, {competitorSelected} competitor)</dd></div>
                    <div className="flex flex-wrap gap-1"><dt className="w-full text-slate-400">Goals</dt>{goalLabels.map((item) => <AdminBadge key={item.id} variant="indigo">{item.label.replace('Increase ', '').replace('Improve ', '').replace('Better ', '').replace('More ', '')}</AdminBadge>)}</div>
                    <div><dt className="text-slate-400">Audience</dt><dd>{[ages.join(', ') || 'All ages', genders.join(', '), geographies.join(', '), languages.join(', ')].filter(Boolean).join(' · ')}</dd></div>
                    <div><dt className="text-slate-400">Interests</dt><dd>{interests.join(', ') || '—'}</dd></div>
                    <div><dt className="text-slate-400">Analysis areas</dt><dd>{focusLabels.map((item) => item.label).join(', ') || 'All available public fields'}</dd></div>
                  </dl>
                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Detailed AI Analysis</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Content Gaps & Opportunities</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Actionable Recommendations</li>
                    <li className="flex gap-2"><Icon name="CheckIcon" size={16} className="text-emerald-600" /> Improvement Plan</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-secondary">What happens next?</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>AI will analyse the selected videos using public YouTube data and your settings.</li>
                    <li>You will get insights, comparisons and recommendations with an action plan.</li>
                    <li>The analysis will be saved and available in Reports after completion.</li>
                  </ol>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">
                  This analysis uses public YouTube Data API fields. Recommendations are suggestions to test, not guarantees of more views or engagement.
                </div>
              </aside>
            </div>
          ) : null}

          {step !== 2 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {step === 1 ? <AdminButton onClick={() => { setGoals(['views']); setFocus([]); }}>Cancel</AdminButton> : null}
              {step > 1 ? <AdminButton onClick={() => setStep(step - 1)}>← Back</AdminButton> : null}
              {step === 1 ? <AdminButton variant="primary" onClick={nextFromStep1}>Next: Select Content →</AdminButton> : null}
              {step === 3 ? <AdminButton variant="primary" onClick={() => setStep(4)}>Next: Review & Generate →</AdminButton> : null}
              {step === 4 ? <AdminButton variant="primary" loading={busy} onClick={generate}><Icon name="SparklesIcon" size={16} /> Generate AI Analysis</AdminButton> : null}
            </div>
          ) : null}
        </>
      ) : screen === 'results' ? (
        <div className="space-y-4">
          {history.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {history.map((row) => (
                <button key={row.id} type="button" onClick={() => openAnalysis(row.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${current?.id === row.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>
                  {row.name} · {row.status}
                </button>
              ))}
            </div>
          ) : null}
          {current?.status === 'ready' && gapPair ? (
            <>
              <section className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary"><Icon name="SparklesIcon" size={18} /> Own video and competitor video</p>
                <h3 className="mt-1 font-bricolage text-lg font-semibold text-slate-900">Gaps are scored on each video, using the other video in the pair.</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">Views, viewership share, likes, comments, description, and title come from the public video record. Watch hours, geography, ages watched, and genders watched are not shared by YouTube for these videos.</p>
              </section>
              <GapCards videos={current?.evidence?.videos || []} actions={current.actions || []} onStatus={saveAction} />
            </>
          ) : current?.status === 'ready' ? (
            <>
              <section className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary"><Icon name="SparklesIcon" size={18} /> AI-assisted summary</p>
                <h3 className="mt-1 font-bricolage text-lg font-semibold text-slate-900">{result.summary?.headline}</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{result.summary?.body}</p>
              </section>
              <div className="grid gap-3 md:grid-cols-2">
                {observations.map((card: Record<string, any>, index: number) => {
                  const key = `${card.headline}-${index}`;
                  const open = openCard === key;
                  return (
                    <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <AdminBadge variant="indigo">{card.category}</AdminBadge>
                      <h3 className="mt-2 text-sm font-semibold text-slate-900">{card.headline}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{card.observation}</p>
                      <button type="button" className="mt-2 text-xs font-semibold text-secondary" onClick={() => setOpenCard(open ? '' : key)}>{open ? 'Hide details' : 'Show evidence'}</button>
                      {open ? (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-600">
                          <p><span className="font-semibold text-slate-800">Evidence:</span> {card.evidence}</p>
                          <p><span className="font-semibold text-slate-800">Implication:</span> {card.implication}</p>
                          <p><span className="font-semibold text-slate-800">Next step:</span> {card.action}</p>
                          {(card.video_ids || []).map((id: string) => videoMap[id] ? <a key={id} className="mr-2 font-semibold text-secondary" href={videoMap[id].watch_url || '#'} target="_blank" rel="noreferrer">{videoMap[id].title || id}</a> : null)}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              {alternatives.titles?.length ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">Proposed alternatives</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">{alternatives.titles.map((item: string) => <li key={item}>{item}</li>)}</ul>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">{(alternatives.thumbnail_concepts || []).map((item: Record<string, string>) => <li key={item.concept}>{item.concept}</li>)}</ul>
                  {alternatives.description ? <p className="mt-3 text-sm text-slate-600">{alternatives.description}</p> : null}
                </section>
              ) : null}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-3.5">
                  <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">Improvement action plan</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {(current.actions || []).map((item: Record<string, any>) => (
                    <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
                      <div>
                        <AdminBadge variant={item.kind === 'new' ? 'sky' : 'green'}>{item.kind === 'new' ? 'Create New Video' : 'Improve Existing Video'}</AdminBadge>
                        <h3 className="mt-2 text-sm font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                        <p className="mt-1 text-xs text-slate-500">Monitor: {item.metric} · Review: {item.review_period}</p>
                      </div>
                      <select className="mt-1 h-11 rounded-xl border border-slate-200 px-3 text-sm" value={item.status} onChange={(event) => saveAction(item.id, event.target.value)}>
                        {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : <p className="text-sm text-slate-500">No saved analysis yet.</p>}
        </div>
      ) : null}
    </div>
  );
}
