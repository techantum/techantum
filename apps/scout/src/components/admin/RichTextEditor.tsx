'use client';

import { useEffect, useRef } from 'react';

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter description',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || '';
  }, [value]);

  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || '');
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        {[
          ['Bold', () => run('bold')],
          ['Italic', () => run('italic')],
          ['H2', () => run('formatBlock', 'h2')],
          ['List', () => run('insertUnorderedList')],
        ].map(([label, fn]) => (
          <button key={label as string} type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white" onClick={fn as () => void}>
            {label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        className="min-h-[140px] px-3 py-2 text-sm text-slate-800 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current?.innerHTML || '')}
      />
    </div>
  );
}
