'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { PlacesOption } from '@/lib/places/location-catalog';

export type { PlacesOption };

interface PlacesSearchSelectProps {
  label: string;
  placeholder: string;
  value: PlacesOption | null;
  onChange: (value: PlacesOption | null) => void;
  fetcher?: (query: string) => Promise<PlacesOption[]>;
  disabled?: boolean;
  hint?: string;
  allowCustom?: boolean;
  localOptions?: PlacesOption[];
}

export default function PlacesSearchSelect({
  label,
  placeholder,
  value,
  onChange,
  fetcher,
  disabled,
  hint,
  allowCustom,
  localOptions = [],
}: PlacesSearchSelectProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<PlacesOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredLocal = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localOptions;
    return localOptions.filter(
      (row) => row.label.toLowerCase().includes(q) || (row.description || '').toLowerCase().includes(q)
    );
  }, [localOptions, query]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!open || disabled || !fetcher) {
      setRemoteOptions([]);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setRemoteOptions([]);
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await fetcher(trimmed);
        if (!controller.signal.aborted) {
          setRemoteOptions(rows);
          setActiveIndex(0);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setRemoteOptions([]);
          if (filteredLocal.length === 0) {
            setError(err instanceof Error ? err.message : 'Search failed');
          }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open, disabled, fetcher, filteredLocal.length]);

  const merged = useMemo(() => {
    const seen = new Set(filteredLocal.map((row) => row.label.toLowerCase()));
    return [...filteredLocal, ...remoteOptions.filter((row) => !seen.has(row.label.toLowerCase()))];
  }, [filteredLocal, remoteOptions]);

  const customOption = useMemo(() => {
    if (!allowCustom) return null;
    const trimmed = query.trim();
    if (!trimmed) return null;
    const exists = merged.some((row) => row.label.toLowerCase() === trimmed.toLowerCase());
    if (exists) return null;
    return { placeId: `custom:${trimmed}`, label: trimmed, description: 'Use this exact search term' };
  }, [allowCustom, merged, query]);

  const visible = customOption ? [customOption, ...merged] : merged;

  const selectOption = (option: PlacesOption) => {
    onChange(option);
    setQuery('');
    setOpen(false);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((current) => {
      const next = !current;
      if (next) setQuery('');
      return next;
    });
  };

  return (
    <div className="text-sm font-medium">
      <span className="block">{label}</span>
      <div ref={rootRef} className="relative mt-1">
        <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
        <input
          id={inputId}
          value={open ? query : value?.label || ''}
          disabled={disabled}
          placeholder={open ? 'Type to filter…' : placeholder}
          autoComplete="off"
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (!event.target.value && value) onChange(null);
          }}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, Math.max(visible.length - 1, 0)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && visible[activeIndex]) {
              event.preventDefault();
              selectOption(visible[activeIndex]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="w-full rounded-xl border border-indigo-100 bg-white/90 py-2.5 pl-9 pr-10 text-sm shadow-sm focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={toggleOpen}
          className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40"
          aria-label={open ? 'Close options' : 'Show options'}
        >
          <Icon name="ChevronDownIcon" size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>

        {open && !disabled && (
          <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-indigo-100 bg-white py-1 shadow-xl shadow-slate-900/10">
            {loading && <p className="px-3 py-2 text-xs text-slate-500">Searching Google Maps…</p>}
            {error && <p className="px-3 py-2 text-xs text-rose-600">{error}</p>}
            {!loading && !error && visible.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500">No matches. Type to search Google Maps.</p>
            )}
            {visible.map((option, index) => (
              <button
                key={`${option.placeId}-${option.label}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={`flex w-full flex-col px-3 py-2 text-left ${
                  index === activeIndex || value?.label === option.label
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm font-medium">{option.label}</span>
                {option.description ? <span className="text-[11px] text-slate-500">{option.description}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
