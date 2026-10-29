'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AnalyseModal, { type AnalyseConfig } from '@/components/admin/youtube/AnalyseModal';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import QuickInsightsModal from '@/components/admin/youtube/QuickInsightsModal';
import { rememberProject, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import Icon from '@/components/ui/AppIcon';
import { PlatformLogo } from '@/components/marketing/BrandIcons';
import { PLATFORM_COPY, RESEARCH_PLATFORMS, asPlatform, contentUrlPlaceholder, parseContentLinks, platformCopy, type ResearchPlatform } from '@/lib/research/platforms';
import { compactCount } from '@/lib/youtube/analysis-display';

const REPORT_TYPES = [
  { id: 'competitor', label: 'Own vs Competitor' },
  { id: 'performance', label: 'Existing Performance' },
  { id: 'gap', label: 'Video Gap Analysis' },
  { id: 'executive', label: 'Executive Research' },
];

function typeChip(video: Record<string, any>) {
  const label = String(video.content_label || video.contentLabel || '');
  if (/short/i.test(label)) return { text: 'Shorts', className: 'bg-rose-50 text-rose-600' };
  if (/how/i.test(label)) return { text: 'How-to', className: 'bg-sky-50 text-sky-700' };
  return { text: label || 'Long Form', className: 'bg-violet-50 text-violet-700' };
}

export default function QuickVideoWizard({ intent }: { intent: 'analysis' | 'report' }) {
  const router = useRouter();
  const base = useYoutubePageBase();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [platform, setPlatform] = useState<ResearchPlatform>('youtube');
  const [urls, setUrls] = useState('');
  const [manual, setManual] = useState('');
  const [videos, setVideos] = useState<Record<string, any>[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [projectId, setProjectId] = useState('');
  const projectRef = useRef('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [reportType, setReportType] = useState('competitor');

  const listed = useMemo(() => videos.filter((video) => {
    const hay = `${video.title} ${video.channel_name}`.toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    if (typeFilter === 'shorts' && !/short/i.test(String(video.content_label || ''))) return false;
    if (typeFilter === 'long' && /short/i.test(String(video.content_label || ''))) return false;
    return true;
  }), [videos, search, typeFilter]);

  const ensureProject = async () => {
    if (projectRef.current) return projectRef.current;
    const saved = await yt('projects', {
      method: 'POST',
      body: JSON.stringify({
        name: intent === 'report' ? `Quick Report · ${new Date().toISOString().slice(0, 10)}` : `Quick Analysis · ${new Date().toISOString().slice(0, 10)}`,
        objective: intent === 'report' ? 'Ad-hoc comparison report' : 'Ad-hoc content analysis',
        status: 'todo',
        platform,
      }),
    });
    rememberProject(saved.id);
    projectRef.current = saved.id;
    setProjectId(saved.id);
    return saved.id as string;
  };

  const addFromText = async (text: string, mode: 'single' | 'multiple' | 'csv') => {
    const copy = platformCopy(platform);
    const links = parseContentLinks(platform, text);
    if (mode === 'single') {
      if (!text.trim()) {
        setError(`Paste one ${copy.label} ${copy.content} URL.`);
        return;
      }
      if (links.length === 0) {
        setError(`Enter a single ${copy.label} ${copy.content} URL, such as ${contentUrlPlaceholder(platform)}`);
        return;
      }
      if (links.length > 1) {
        setError(`This field accepts one URL. Paste a list in Add multiple ${copy.contentPlural}.`);
        return;
      }
    } else if (mode === 'multiple') {
      if (links.length < 2) {
        setError(`Paste at least two ${copy.label} ${copy.content} URLs, one per line.`);
        return;
      }
    } else if (!links.length) {
      setError(`The file did not contain any ${copy.label} ${copy.content} URLs.`);
      return;
    }
    setBusy('fetch');
    setError('');
    try {
      const id = await ensureProject();
      const body = await yt(`projects/${id}/videos/urls`, { method: 'POST', body: JSON.stringify({ text, mode }) });
      const rows = body.rows || [];
      setVideos((current) => {
        const seen = new Set(current.map((item) => String(item.id)));
        return [...current, ...rows.filter((row: Record<string, any>) => !seen.has(String(row.id)))];
      });
      if (mode === 'single') setManual('');
      else setUrls('');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not add those ${platformCopy(platform).contentPlural}`);
    } finally {
      setBusy('');
    }
  };

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const runAnalysis = async (config: AnalyseConfig) => {
    setBusy('summary');
    setError('');
    try {
      const analysis = await yt(`projects/${projectRef.current || projectId}/ai-analyses`, {
        method: 'POST',
        body: JSON.stringify({
          name: videos.find((video) => selected.includes(String(video.id)))?.title || 'Quick analysis',
          workspace: 'quick_analysis',
          goals: config.goals,
          primaryGoal: config.primaryGoal,
          source: 'selected',
          videoIds: selected,
          contentFocus: ['titles', 'thumbnails', 'competitor_insights'],
          targetAges: config.targetAges,
          targetGenders: config.targetGenders,
          geographies: config.geographies,
          languages: config.languages,
          interests: config.interests,
          devices: config.devices,
          audienceNotes: config.audienceNotes,
          outputs: ['improve_existing', 'gap_report'],
        }),
      });
      setAnalyseOpen(false);
      rememberProject(projectRef.current || projectId);
      router.push(`${base}/channel-compare?id=${analysis.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the analysis');
    } finally {
      setBusy('');
    }
  };

  const runReport = async () => {
    if (selected.length < 1) {
      setError(`Select at least one ${platformCopy(platform).content}.`);
      return;
    }
    setBusy('report');
    setError('');
    try {
      const report = await yt(`projects/${projectRef.current || projectId}/research-reports`, {
        method: 'POST',
        body: JSON.stringify({
          name: videos.find((video) => selected.includes(String(video.id)))?.title || `Quick report · ${selected.length} ${platformCopy(platform).contentPlural}`,
          report_type: reportType,
          workspace: 'quick_report',
          videoIds: selected,
        }),
      });
      rememberProject(projectRef.current || projectId);
      router.push(`${base}/reports/${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the report');
    } finally {
      setBusy('');
    }
  };

  const analysis = intent === 'analysis';
  const copy = platformCopy(platform);
  const noun = copy.content;
  const nouns = copy.contentPlural;
  const placeholder = contentUrlPlaceholder(platform);

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={analysis ? `${base}/quick-analysis` : `${base}/quick-reports`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <Icon name="ArrowLeftIcon" size={16} /> {analysis ? 'Back to Quick Analysis' : 'Back'}
          </Link>
          <h1 className="mt-2 font-bricolage text-3xl font-bold text-slate-900">{analysis ? 'New Quick Analysis' : 'New Quick Report'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {analysis
              ? 'Choose a platform, add public URLs, select the ones you want, and generate insights in seconds.'
              : 'Choose a platform, add public URLs, select the ones you want, and generate a downloadable report.'}
          </p>
        </div>
      </div>

      <ol className="grid gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        {[
          { n: 1, title: 'Choose platform', copy: 'YouTube, Facebook, Instagram, or LinkedIn' },
          { n: 2, title: platform === 'youtube' ? 'Add video URLs' : 'Add post URLs', copy: platform === 'youtube' ? 'Paste YouTube video links' : `Paste public ${copy.label} post links` },
          { n: 3, title: analysis ? 'Analyze selected' : 'Generate report', copy: analysis ? 'Generate insights' : 'Create your downloadable report' },
        ].map((item) => (
          <li key={item.n} className="flex items-start gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${item.n <= step || videos.length ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.n}</span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
              <span className="block text-xs text-slate-500">{item.copy}</span>
            </span>
          </li>
        ))}
      </ol>

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      {step === 1 ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Step 1 · Platform</h2>
          <p className="mt-1 text-sm text-slate-500">One quick analysis or report is for a single platform.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {RESEARCH_PLATFORMS.map((id) => {
              const item = PLATFORM_COPY[id];
              const active = platform === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlatform(asPlatform(id))}
                  className={`rounded-2xl border px-4 py-4 text-left ${active ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <PlatformLogo platform={id} className="h-8 w-8" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{id === 'youtube' ? 'Add video URLs next.' : 'Add post URLs next.'}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setError(''); setStep(2); }}>
              Next: {platform === 'youtube' ? 'Add videos' : 'Add posts'} →
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
          onClick={() => { if (!videos.length) setStep(1); }}
          disabled={videos.length > 0}
        >
          <Icon name="ArrowLeftIcon" size={16} /> Back to platform
        </button>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <PlatformLogo platform={platform} className="h-6 w-6" />
          {copy.label}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Single {noun}</p>
              <h2 className="mt-1 font-semibold text-slate-900">Add a {noun} URL</h2>
              <p className="mt-1 text-sm text-slate-500">Paste one public {copy.label} {noun} link. To add a list, use the multiple panel.</p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Icon name="LinkIcon" size={18} />
            </span>
          </div>
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addFromText(manual, 'single'); } }}
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400"
            placeholder={placeholder}
          />
          <button
            type="button"
            disabled={!!busy}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void addFromText(manual, 'single')}
          >
            <Icon name="PlusIcon" size={16} /> Add {noun}
          </button>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">Multiple {nouns}</p>
              <h2 className="mt-1 font-semibold text-slate-900">Add {noun} URLs</h2>
              <p className="mt-1 text-sm text-slate-500">Paste two or more links, one per line, or upload a CSV of URLs.</p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Icon name="QueueListIcon" size={18} />
            </span>
          </div>
          <textarea
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            rows={4}
            className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
            placeholder={`${placeholder}\n${placeholder}`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600" onClick={() => fileRef.current?.click()}>
              <Icon name="ArrowUpTrayIcon" size={16} /> Upload CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await addFromText(await file.text(), 'csv');
                event.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={!!busy}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void addFromText(urls, 'multiple')}
            >
              <Icon name="PlusIcon" size={16} /> Add {nouns}
            </button>
          </div>
        </section>
      </div>
      </div>
      ) : null}

      {videos.length ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-semibold text-slate-700">Added {nouns} ({videos.length})</p>
            <label className="relative flex-1 min-w-[180px]">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm" placeholder={`Search ${nouns} by title or keyword...`} />
            </label>
            {platform === 'youtube' ? (
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
              <option value="all">All types</option>
              <option value="long">Long Form</option>
              <option value="shorts">Shorts</option>
            </select>
            ) : null}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-2"><input type="checkbox" checked={listed.length > 0 && listed.every((video) => selected.includes(String(video.id)))} onChange={(event) => setSelected(event.target.checked ? listed.map((video) => String(video.id)) : [])} /></th>
                  <th className="px-2 py-2">{platform === 'youtube' ? 'Video' : 'Post'}</th>
                  <th className="px-2 py-2">{copy.entity === 'page' ? 'Page' : 'Channel'}</th>
                  <th className="px-2 py-2">Duration</th>
                  <th className="px-2 py-2">Published</th>
                  <th className="px-2 py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {listed.map((video) => {
                  const id = String(video.id);
                  const on = selected.includes(id);
                  const chip = typeChip(video);
                  return (
                    <tr key={id} className="border-t border-slate-100">
                      <td className="px-2 py-3"><input type="checkbox" checked={on} onChange={() => toggle(id)} /></td>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-3">
                          <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
                            {video.duration_label ? <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white">{video.duration_label}</span> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-900">{video.title}</span>
                            <span className="block text-xs text-slate-400">{compactCount(video.view_count)} views</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-600">{video.channel_name}</td>
                      <td className="px-2 py-3 text-slate-500">{video.duration_label || '—'}</td>
                      <td className="px-2 py-3 text-slate-500">{video.published_at ? new Date(video.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td className="px-2 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip.className}`}>{chip.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {selected.length ? (
        <div className="fixed inset-x-0 bottom-4 z-[70] mx-auto flex max-w-5xl flex-wrap items-center gap-3 rounded-full border border-violet-100 bg-white px-4 py-3 shadow-xl lg:left-72">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">{selected.length}</span>
          <span className="text-sm font-semibold text-slate-800">{selected.length} {selected.length === 1 ? noun : nouns} selected</span>
          <span className="hidden text-sm text-slate-400 sm:inline">{analysis ? 'Choose an action to continue with your analysis' : ''}</span>
          {analysis ? null : (
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
              Report format
              <select value={reportType} onChange={(event) => setReportType(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1">
                <option value="pdf-exec" disabled>PDF</option>
                {REPORT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setSelected([])}>Clear selection</button>
          {analysis ? (
            <>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700" onClick={() => setInsightsOpen(true)}>
                <Icon name="SparklesIcon" size={16} /> Generate Quick Insights
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setAnalyseOpen(true)}>
                <Icon name="PlayIcon" size={16} /> Analyze Selected
              </button>
            </>
          ) : (
            <button type="button" disabled={!!busy} className="ml-auto inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => void runReport()}>
              <Icon name="DocumentChartBarIcon" size={16} /> Generate Report
            </button>
          )}
        </div>
      ) : null}

      {busy === 'fetch' ? <FetchVideosOverlay platform={platform} /> : null}
      {busy === 'report' ? <FetchVideosOverlay mode="report" platform={platform} /> : null}
      {insightsOpen ? (
        <QuickInsightsModal
          videos={videos.filter((video) => selected.includes(String(video.id)))}
          onClose={() => setInsightsOpen(false)}
          onAnalyze={() => { setInsightsOpen(false); setAnalyseOpen(true); }}
        />
      ) : null}
      {analyseOpen ? (
        <AnalyseModal
          videos={videos.filter((video) => selected.includes(String(video.id)))}
          busy={busy === 'summary'}
          error={error}
          onClose={() => { if (busy !== 'summary') setAnalyseOpen(false); }}
          onGenerate={runAnalysis}
        />
      ) : null}
    </div>
  );
}
