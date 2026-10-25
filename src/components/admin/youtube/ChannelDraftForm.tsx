'use client';

import { useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import { metric, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerInput } from '@/components/partner/PartnerUi';

export default function ChannelDraftForm({
  relationship,
  projectId,
  hasOwn,
  compact = false,
  onSaved,
  onCancel,
}: {
  relationship: 'own' | 'competitor';
  projectId: string;
  hasOwn: boolean;
  compact?: boolean;
  onSaved: (result?: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
}) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'fetch' | 'save' | ''>('');

  const fetchChannel = async () => {
    setError('');
    setPreview(null);
    setPending('fetch');
    try {
      setPreview(await yt('channels/resolve', { method: 'POST', body: JSON.stringify({ input }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch the channel');
    } finally {
      setPending('');
    }
  };

  const save = async () => {
    setError('');
    if (relationship === 'own' && hasOwn && !window.confirm('Replace the current own channel? The previous one stays in the project as a competitor.')) return;
    setPending('save');
    try {
      const saved = await yt(`projects/${projectId}/channels`, { method: 'POST', body: JSON.stringify({ input, relationship }) });
      setPreview(null);
      setInput('');
      await onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the channel');
    } finally {
      setPending('');
    }
  };

  return (
    <div className={compact ? 'min-w-[18rem] rounded-xl border border-dashed border-secondary/40 bg-orange-50/50 p-3' : 'rounded-xl border border-slate-200 bg-slate-50 p-4'}>
      <p className="text-sm font-semibold text-slate-800">{relationship === 'own' ? 'Connect your YouTube channel' : 'Add competitor'}</p>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input className={partnerInput} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Channel URL, @handle, or ID" />
        <AdminButton variant="primary" loading={pending === 'fetch'} onClick={fetchChannel}>Fetch</AdminButton>
        {onCancel ? <AdminButton onClick={() => { setInput(''); setPreview(null); setError(''); onCancel(); }}>Cancel</AdminButton> : null}
      </div>
      {preview ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {preview.thumbnailUrl ? <img src={preview.thumbnailUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : null}
          <div className="min-w-0">
            <p className="font-semibold">{preview.channelName}</p>
            <p className="text-slate-500">{preview.channelHandle ? `@${preview.channelHandle}` : preview.youtubeChannelId} · {metric(preview.subscriberCount)} subscribers</p>
          </div>
          <AdminButton variant="primary" loading={pending === 'save'} onClick={save}>Save in project</AdminButton>
        </div>
      ) : null}
    </div>
  );
}
