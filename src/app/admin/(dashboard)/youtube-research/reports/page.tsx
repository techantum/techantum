'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { ChartCard, EMPTY_FILTERS, MonthBarChart, ResearchFilters, VideoMiniTable, applyPreset, downloadProjectExport, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import { metric, ProjectRequired, useProjectId, yt } from '@/components/admin/youtube/YoutubeFrame';

const REPORTS = [
  { id: 'project_summary', label: 'Project summary', hint: 'Channels saved in this project' },
  { id: 'videos', label: 'Video research', hint: 'Imported videos, topics, and notes' },
  { id: 'topics', label: 'Topic analysis', hint: 'Videos with a research topic' },
  { id: 'tags', label: 'Tag research', hint: 'Public tags returned by YouTube' },
  { id: 'comparison', label: 'Video comparison', hint: 'The same fields, side by side in the file' },
  { id: 'competitors', label: 'Channel comparison', hint: 'Own channel and competitors' },
];

function Reports() {
  const projectId = useProjectId();
  const [projectName, setProjectName] = useState('');
  const [filterOptions, setFilterOptions] = useState<ResearchFilterOptions>({});
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [form, setForm] = useState({ type: 'videos', format: 'xlsx' });
  const [insights, setInsights] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (next = filters) => {
    const params = new URLSearchParams({ ...next, channelIds: next.channelIds || '' });
    setInsights(await yt(`projects/${projectId}/insights?${params}`));
  };

  useEffect(() => {
    if (!projectId) return;
    Promise.all([yt(`projects/${projectId}`), yt(`projects/${projectId}/filters`), load()]).then(([project, options]) => {
      setProjectName(project.name || '');
      setFilterOptions(options);
    }).catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      await downloadProjectExport({
        ...form,
        ...filters,
        topic_id: filters.topicId,
        channel_id: filters.channelIds || '',
        project_id: projectId,
        project_name: projectName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-bricolage text-xl font-bold text-slate-900">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Preview matching imported videos, then download Excel, CSV, or PDF. PDF shows the first 40 rows.</p>
        </div>
        <AdminButton variant="primary" disabled={busy} onClick={download}>{busy ? 'Preparing...' : 'Generate report'}</AdminButton>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((report) => (
            <button key={report.id} type="button" onClick={() => setForm({ ...form, type: report.id })} className={`rounded-xl border px-3 py-2 text-left ${form.type === report.id ? 'border-secondary bg-orange-50' : 'border-slate-200 bg-white'}`}>
              <span className="block text-sm font-semibold text-slate-900">{report.label}</span>
              <span className="block text-xs text-slate-500">{report.hint}</span>
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium">Format
          <select className="mt-1 h-11 rounded-xl border border-slate-200 px-3 text-sm" value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })}>
            <option value="xlsx">Excel</option>
            <option value="docx">Word</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
      </section>
      <ResearchFilters
        value={filters}
        options={filterOptions}
        onChange={setFilters}
        onApply={(next) => { const used = next || filters; setFilters(used); load(used).catch((err) => setError(err.message)); }}
        onReset={() => { const next = { ...EMPTY_FILTERS, ...applyPreset('all') }; setFilters(next); load(next).catch((err) => setError(err.message)); }}
      />
      {insights ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Matching videos" value={metric(insights.imported)} icon="FilmIcon" />
            <AdminStatCard label="Public views" value={metric(insights.views)} hint="Current public views on matching imported rows" icon="ChartBarIcon" />
            <AdminStatCard label="Categorized" value={metric(insights.categorized)} icon="TagIcon" />
            <AdminStatCard label="Shorts" value={metric(insights.shorts)} icon="PlayCircleIcon" />
          </div>
          <ChartCard title="Matching videos by month" hint="Publish months of imported videos in this report.">
            <MonthBarChart data={(insights.months || []).map((item: Record<string, any>) => ({ month: item.month, Imported: item.imported, Views: item.views }))} bars={[{ key: 'Imported', color: '#EA580C' }, { key: 'Views', color: '#2563EB' }]} />
          </ChartCard>
          <VideoMiniTable title="Preview" rows={insights.recentVideos || []} empty="No imported videos match these filters." />
          <p className="text-xs text-slate-500">{insights.notice}</p>
        </>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  return <ProjectRequired><Reports /></ProjectRequired>;
}
