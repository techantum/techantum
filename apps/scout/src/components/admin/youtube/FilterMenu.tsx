'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/AppIcon';

export type FilterOption = { id: string; label: string; count?: number };

export function csvValues(value: string) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function FilterMenu({
  label,
  value,
  options,
  onChange,
  multiple = false,
  allLabel,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  multiple?: boolean;
  allLabel?: string;
}) {
  const selected = csvValues(value);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260 });

  const place = () => {
    const box = buttonRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = Math.max(box.width, 280);
    let left = box.left;
    if (left + width > window.innerWidth - 12) left = box.right - width;
    setPos({
      top: box.bottom + 8,
      left: Math.min(Math.max(12, left), window.innerWidth - width - 12),
      width,
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const summary = () => {
    if (!selected.length) return allLabel || `All ${label.toLowerCase()}`;
    if (!multiple) return options.find((item) => item.id === selected[0])?.label || selected[0];
    if (selected.length === 1) return options.find((item) => item.id === selected[0])?.label || selected[0];
    return `${selected.length} ${label.toLowerCase()}`;
  };

  const toggle = (id: string) => {
    if (!multiple) {
      onChange(id);
      setOpen(false);
      return;
    }
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    onChange(next.join(','));
  };

  const active = multiple && selected.length > 0;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-10 max-w-[16rem] items-center gap-2 rounded-full border px-3.5 text-sm font-semibold shadow-sm transition ${
          open || active
            ? 'border-violet-200 bg-violet-50 text-violet-800'
            : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/50'
        }`}
      >
        <span className="truncate">{summary()}</span>
        {multiple && selected.length > 1 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] text-white">{selected.length}</span>
        ) : null}
        <Icon name="ChevronDownIcon" size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180 text-violet-500' : ''}`} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-multiselectable={multiple}
            className="fixed z-[80] overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {multiple ? (
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-violet-600 hover:text-violet-800"
                  onClick={() => onChange(selected.length === options.length ? '' : options.map((item) => item.id).join(','))}
                >
                  {selected.length === options.length ? 'Clear' : 'Select all'}
                </button>
              </div>
            ) : null}
            <div className="max-h-72 overflow-auto">
              {!multiple && allLabel ? (
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm ${!selected.length ? 'bg-violet-50 font-semibold text-violet-800' : 'text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => { onChange(''); setOpen(false); }}
                >
                  {allLabel}
                </button>
              ) : null}
              {options.map((item) => {
                const checked = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${checked ? 'bg-violet-50 text-violet-800' : 'text-slate-700 hover:bg-slate-50'}`}
                    onClick={() => toggle(item.id)}
                  >
                    {multiple ? (
                      <span className={`flex h-4 w-4 items-center justify-center rounded-md border ${checked ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                        <Icon name="CheckIcon" size={12} />
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.count != null ? <span className="text-[11px] font-semibold text-slate-400">{item.count}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
