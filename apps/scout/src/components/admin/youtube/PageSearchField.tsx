'use client';

import { useEffect, useRef, useState } from 'react';
import { metric, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import SafeImage from '@/components/ui/SafeImage';
import { platformCopy, type ResearchPlatform } from '@/lib/research/platforms';
import { enterPlaceholder } from '@/lib/forms/rules';

type PageHit = {
  youtubeChannelId: string;
  channelName?: string | null;
  channelHandle?: string | null;
  channelUrl?: string | null;
  thumbnailUrl?: string | null;
  subscriberCount?: number | null;
};

export default function PageSearchField({
  platform,
  value,
  selected,
  onQuery,
  onSelect,
  autoFocus = false,
}: {
  platform: ResearchPlatform | string;
  value: string;
  selected: PageHit | null;
  onQuery: (value: string) => void;
  onSelect: (hit: PageHit) => void;
  autoFocus?: boolean;
}) {
  const copy = platformCopy(platform);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<PageHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const request = useRef(0);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (selected && q === (selected.channelName || '')) {
      setHits([]);
      setOpen(false);
      return;
    }
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      setError('');
      setOpen(false);
      return;
    }
    const id = ++request.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      yt(`channels/search?platform=${encodeURIComponent(copy.id)}&q=${encodeURIComponent(q)}`)
        .then((body) => {
          if (id !== request.current) return;
          const rows = Array.isArray(body.rows) ? body.rows : [];
          setHits(rows);
          setError('');
          setOpen(true);
        })
        .catch((err) => {
          if (id !== request.current) return;
          setHits([]);
          setError(err instanceof Error ? err.message : `Could not search ${copy.entityPlural}`);
          setOpen(true);
        })
        .finally(() => {
          if (id === request.current) setLoading(false);
        });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [value, copy.id, copy.entityPlural, selected]);

  return (
    <div ref={boxRef} className="relative">
      <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-3 z-10 text-slate-400" />
      <input
        autoFocus={autoFocus}
        className={`${partnerInput} pl-9`}
        value={value}
        placeholder={enterPlaceholder(copy.placeholder)}
        aria-autocomplete="list"
        aria-expanded={open}
        onFocus={() => { if (hits.length || error || loading) setOpen(true); }}
        onChange={(event) => {
          onQuery(event.target.value);
          setOpen(true);
        }}
      />
      {open && value.trim().length >= 2 ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
          {loading && !hits.length ? (
            <p className="px-3 py-3 text-sm text-slate-500">Searching {copy.entityPlural}…</p>
          ) : error ? (
            <p className="px-3 py-3 text-sm text-rose-600">{error}</p>
          ) : !hits.length ? (
            <p className="px-3 py-3 text-sm text-slate-500">No matching {copy.entityPlural}</p>
          ) : (
            hits.map((hit) => {
              const active = selected?.youtubeChannelId === hit.youtubeChannelId;
              return (
                <button
                  key={hit.youtubeChannelId}
                  type="button"
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${active ? 'bg-violet-50' : ''}`}
                  onClick={() => {
                    onSelect(hit);
                    setOpen(false);
                  }}
                >
                  {hit.thumbnailUrl ? (
                    <SafeImage
                      src={hit.thumbnailUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                      fallback={<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{String(hit.channelName || 'P').charAt(0).toUpperCase()}</span>}
                    />
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{String(hit.channelName || 'P').charAt(0).toUpperCase()}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{hit.channelName || hit.youtubeChannelId}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {hit.channelHandle ? `@${String(hit.channelHandle).replace(/^@/, '')}` : hit.youtubeChannelId}
                      {hit.subscriberCount != null ? ` · ${metric(hit.subscriberCount)} ${copy.entity === 'page' ? 'followers' : 'subscribers'}` : ''}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export function pageInputFor(hit: PageHit) {
  return hit.channelUrl || hit.channelHandle || hit.youtubeChannelId;
}
