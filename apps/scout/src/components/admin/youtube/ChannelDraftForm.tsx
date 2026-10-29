'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import PageSearchField, { pageInputFor } from '@/components/admin/youtube/PageSearchField';
import { metric, yt } from '@/components/admin/youtube/YoutubeFrame';
import { facebookPageConnectHref, platformCopy, type ResearchPlatform } from '@/lib/research/platforms';
import { partnerBtnSecondary } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import { useProcess } from '@/components/ui/ProcessOverlay';
import SafeImage from '@/components/ui/SafeImage';

export default function ChannelDraftForm({
  relationship,
  projectId,
  hasOwn,
  compact = false,
  modal = false,
  competitorCount = 0,
  competitorLimit = 5,
  platform = 'youtube',
  onSaved,
  onCancel,
}: {
  relationship: 'own' | 'competitor';
  projectId: string;
  hasOwn: boolean;
  compact?: boolean;
  modal?: boolean;
  competitorCount?: number;
  competitorLimit?: number;
  platform?: ResearchPlatform | string;
  onSaved: (result?: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
}) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'save' | ''>('');
  const [mounted, setMounted] = useState(false);
  const overlay = useProcess();
  const own = relationship === 'own';
  const copy = platformCopy(platform);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!modal) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [modal, onCancel, pending]);

  const save = async () => {
    setError('');
    if (!preview) {
      setError(`Select a ${copy.entity} from the list.`);
      return;
    }
    if (own && hasOwn && !window.confirm(`Replace the current own ${copy.entity}? The previous one stays in the project as a competitor.`)) return;
    if (!own && competitorCount >= competitorLimit) {
      setError(`This project already has ${competitorLimit} competitors.`);
      return;
    }
    setPending('save');
    try {
      await overlay.run(own ? `Connecting your ${copy.entity}…` : `Adding competitor ${copy.entity}…`, async () => {
        const saved = await yt(`projects/${projectId}/channels`, { method: 'POST', body: JSON.stringify({ input: pageInputFor(preview), relationship, page: preview }) });
        setPreview(null);
        setInput('');
        await onSaved(saved);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not save the ${copy.entity}`);
    } finally {
      setPending('');
    }
  };

  const form = (
    <>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {copy.id === 'facebook' && own ? (
        <a className={`${partnerBtnSecondary} mt-3 inline-flex`} href={facebookPageConnectHref(projectId, typeof window === 'undefined' ? '/facebook/posts' : window.location.pathname)}>
          Connect Facebook Page for insights
        </a>
      ) : null}
      <div className="mt-3">
        <PageSearchField
          platform={copy.id}
          value={input}
          selected={preview}
          autoFocus={modal}
          onQuery={(next) => { setInput(next); setPreview(null); setError(''); }}
          onSelect={(hit) => {
            setPreview(hit);
            setInput(hit.channelName || hit.channelHandle || hit.youtubeChannelId);
            setError('');
          }}
        />
      </div>
      {preview ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm">
          {preview.thumbnailUrl ? (
            <SafeImage
              src={preview.thumbnailUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
              fallback={(
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500">
                  {String(preview.channelName || 'C').slice(0, 1).toUpperCase()}
                </span>
              )}
            />
          ) : (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500">
              {String(preview.channelName || 'C').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{preview.channelName}</p>
            <p className="text-slate-500">
              {[
                preview.channelHandle ? `@${String(preview.channelHandle).replace(/^@/, '')}` : preview.youtubeChannelId,
                preview.subscriberCount != null ? `${metric(preview.subscriberCount)} ${copy.entity === 'page' ? 'followers' : 'subscribers'}` : '',
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          {!modal ? (
            <AdminButton variant="primary" loading={pending === 'save'} onClick={save}>{own ? `Save ${copy.entity}` : 'Save'}</AdminButton>
          ) : null}
        </div>
      ) : modal ? (
        !own ? <p className="mt-3 text-xs leading-5 text-slate-400">{competitorCount} of {competitorLimit} competitors in this project.</p> : null
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          {own
            ? copy.hint
            : `You can add up to ${competitorLimit} competitors. ${competitorCount} already in this project.`}
        </p>
      )}
    </>
  );

  if (modal && mounted && typeof document !== 'undefined') {
    return createPortal(
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="channel-add-title">
        <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={() => { if (!pending) onCancel?.(); }} />
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.label}</p>
              <h2 id="channel-add-title" className="font-bricolage text-xl font-semibold text-slate-900">
                {own ? copy.ownLabel : `Add competitor ${copy.entity}`}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {own
                  ? copy.hint
                  : `Type a competitor ${copy.entity} name and select it. Public ${copy.contentPlural} can be fetched after you save.`}
              </p>
            </div>
            <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => { if (!pending) onCancel?.(); }} aria-label="Close">
              <Icon name="XMarkIcon" size={20} />
            </button>
          </div>
          <div className="px-6 py-5">{form}</div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button type="button" className={partnerBtnSecondary} disabled={Boolean(pending)} onClick={onCancel}>Cancel</button>
            <AdminButton variant="primary" disabled={!preview} loading={pending === 'save'} onClick={save}>Save</AdminButton>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className={compact ? 'min-w-[18rem] rounded-xl border border-dashed border-secondary/40 bg-orange-50/50 p-3' : 'rounded-xl border border-slate-200 bg-slate-50 p-4'}>
      <p className="text-sm font-semibold text-slate-800">{own ? copy.ownLabel : `Add competitor ${copy.entity}`}</p>
      {form}
    </div>
  );
}
