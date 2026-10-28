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
import { compactCount } from '@/lib/youtube/analysis-display';
import { parseYoutubeVideoIds } from '@/lib/youtube/parse';

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
        objective: intent === 'report' ? 'Ad-hoc comparison report' : 'Ad-hoc video analysis',
        status: 'todo',
      }),
    });
    rememberProject(saved.id);
    projectRef.current = saved.id;
    setProjectId(saved.id);
    return saved.id as string;
  };

  const addFromText = async (text: string, mode: 'single' | 'multiple' | 'csv') => {
    const ids = parseYoutubeVideoIds(text);
    if (mode === 'single') {
      if (!text.trim()) {
        setError('Paste one YouTube video URL.');
        return;
      }
      if (ids.length === 0) {
        setError('Enter a single YouTube video URL, such as https://www.youtube.com/watch?v=…');
        return;
      }
      if (ids.length > 1) {
        setError('This field accepts one URL. Paste a list in Add multiple videos.');
        return;
      }
    } else if (mode === 'multiple') {
      if (ids.length < 2) {
        setError('Paste at least two YouTube video URLs, one per line.');
        return;
      }
    } else if (!ids.length) {
      setError('The file did not contain any YouTube video URLs.');
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
      setError(err instanceof Error ? err.message : 'Could not add those videos');
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
      setError('Select at least one video.');
      return;
    }
    setBusy('report');
    setError('');
    try {
      const report = await yt(`projects/${projectRef.current || projectId}/research-reports`, {
        method: 'POST',
        body: JSON.stringify({
          name: videos.find((video) => selected.includes(String(video.id)))?.title || `Quick report · ${selected.length} videos`,
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
              ? 'Add YouTube videos, select the ones you want to analyze, and generate insights in seconds.'
              : 'Create a downloadable report from selected YouTube videos. Add videos, choose the ones you want, and generate your report.'}
          </p>
        </div>
      </div>

      <ol className="grid gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        {[
          { n: 1, title: analysis ? 'Add YouTube videos' : 'Add videos', copy: 'Add one URL, or paste several at once' },
          { n: 2, title: 'Select videos', copy: analysis ? 'Choose the videos you want to analyze' : 'Choose the ones you want' },
          { n: 3, title: analysis ? 'Analyze selected' : 'Generate report', copy: analysis ? 'Generate insights and reports' : 'Create your downloadable report' },
        ].map((step) => (
          <li key={step.n} className="flex items-start gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.n === 1 || videos.length ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{step.n}</span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
              <span className="block text-xs text-slate-500">{step.copy}</span>
            </span>
          </li>
        ))}
      </ol>

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Single video</p>
              <h2 className="mt-1 font-semibold text-slate-900">Add a video URL</h2>
              <p className="mt-1 text-sm text-slate-500">Paste one YouTube link. To add a list, use the multiple-videos panel.</p>
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
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <button
            type="button"
            disabled={!!busy}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void addFromText(manual, 'single')}
          >
            <Icon name="PlusIcon" size={16} /> Add video
          </button>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">Multiple videos</p>
              <h2 className="mt-1 font-semibold text-slate-900">Add video URLs</h2>
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
            placeholder={'https://www.youtube.com/watch?v=abc123\nhttps://youtu.be/def456\nhttps://www.youtube.com/shorts/ghi789'}
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
              <Icon name="PlusIcon" size={16} /> Add videos
            </button>
          </div>
        </section>
      </div>

      {videos.length ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-semibold text-slate-700">Added videos ({videos.length})</p>
            <label className="relative flex-1 min-w-[180px]">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm" placeholder={analysis ? 'Search videos by title or keyword...' : 'Search videos...'} />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
              <option value="all">{analysis ? 'All types' : 'Video type: All types'}</option>
              <option value="long">Long Form</option>
              <option value="shorts">Shorts</option>
            </select>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-2"><input type="checkbox" checked={listed.length > 0 && listed.every((video) => selected.includes(String(video.id)))} onChange={(event) => setSelected(event.target.checked ? listed.map((video) => String(video.id)) : [])} /></th>
                  <th className="px-2 py-2">Video</th>
                  <th className="px-2 py-2">Channel</th>
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
          <span className="text-sm font-semibold text-slate-800">{selected.length} video{selected.length === 1 ? '' : 's'} selected</span>
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

      {busy === 'fetch' ? <FetchVideosOverlay /> : null}
      {busy === 'report' ? <FetchVideosOverlay mode="report" /> : null}
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
