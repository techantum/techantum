'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { rememberProject, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

export default function ProjectForm({ projectId = '' }: { projectId?: string }) {
  const router = useRouter();
  const base = useYoutubePageBase();
  const [form, setForm] = useState({ name: '', brand_name: '', objective: '', industry: '', description: '', status: 'active' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!projectId);

  useEffect(() => {
    if (!projectId) return;
    yt(`projects/${projectId}`).then((body) => setForm({
      name: body.name || '',
      brand_name: body.brand_name || '',
      objective: body.objective || '',
      industry: body.industry || '',
      description: body.description || '',
      status: body.status || 'active',
    })).catch((err) => setError(err.message)).finally(() => setReady(true));
  }, [projectId]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const saved = projectId
        ? await yt(`projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(form) })
        : await yt('projects', { method: 'POST', body: JSON.stringify(form) });
      rememberProject(saved.id);
      router.push(`${base}/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the project');
      setBusy(false);
    }
  };

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  if (!ready && !error) return <PageLoader label="Loading project…" />;

  return (
    <div className="space-y-4">
      {projectId ? null : (
        <AdminPageHeader title="Create Research Project" backHref={base} backLabel="Back" />
      )}
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <AdminSection title={projectId ? 'Project details' : 'Project setup'} icon="RectangleStackIcon">
        <AdminFormGrid cols={2}>
          <AdminField label="Project name">
            <input className={adminInputClass} value={form.name} placeholder="Enter project name" onChange={(event) => set('name', event.target.value)} />
          </AdminField>
          <AdminField label="Research objective">
            <input className={adminInputClass} value={form.objective} onChange={(event) => set('objective', event.target.value)} placeholder="Enter research objective" />
          </AdminField>
          <AdminField label="Client / brand name">
            <input className={adminInputClass} value={form.brand_name} placeholder="Enter brand name" onChange={(event) => set('brand_name', event.target.value)} />
          </AdminField>
          <AdminField label="Description">
            <textarea className={adminTextareaClass} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Enter description" />
          </AdminField>
          <AdminField label="Industry">
            <input className={adminInputClass} value={form.industry} placeholder="Enter industry" onChange={(event) => set('industry', event.target.value)} />
          </AdminField>
        </AdminFormGrid>
        <div className="mt-4 flex justify-end gap-2">
          <Link href={base} className="btn-secondary">Cancel</Link>
          <AdminButton variant="primary" loading={busy} process={projectId ? 'Saving project…' : 'Creating project…'} onClick={save}>{projectId ? 'Save Project' : 'Create Project'}</AdminButton>
        </div>
      </AdminSection>
    </div>
  );
}
