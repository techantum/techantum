'use client';

import Icon from '@/components/ui/AppIcon';

export default function FieldHint({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-secondary"
        aria-label="Help"
      >
        <Icon name="InformationCircleIcon" size={16} />
      </button>
      <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-5 text-white opacity-0 shadow-lg group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}
