'use client';

import Icon from '@/components/ui/AppIcon';
import { ENGAGEMENT_TYPES } from '@/lib/partner/service-catalog';

interface EngagementTypeSelectorProps {
  value: string;
  onChange: (slug: string) => void;
  loading?: boolean;
}

export default function EngagementTypeSelector({
  value,
  onChange,
  loading = false,
}: EngagementTypeSelectorProps) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Requirement Type</h2>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-secondary shrink-0">
            <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
            Updating fields…
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            !value
              ? 'border-secondary bg-orange-50/80 ring-1 ring-secondary/20'
              : 'border-slate-200 hover:border-secondary/40 bg-white'
          }`}
        >
          <Icon
            name="CubeIcon"
            size={22}
            className={!value ? 'text-secondary' : 'text-slate-400'}
          />
          <p className="font-semibold text-slate-900 mt-2 text-sm">Standard Package</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Use questionnaire for the selected Website / Web App / Mobile plan.
          </p>
        </button>

        {ENGAGEMENT_TYPES.map((eng) => {
          const selected = value === eng.slug;
          return (
            <button
              key={eng.slug}
              type="button"
              onClick={() => onChange(eng.slug)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                selected
                  ? 'border-secondary bg-orange-50/80 ring-1 ring-secondary/20'
                  : 'border-slate-200 hover:border-secondary/40 bg-white'
              }`}
            >
              {selected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center">
                  <Icon name="CheckIcon" size={12} />
                </span>
              )}
              <Icon
                name={eng.icon as 'RocketLaunchIcon'}
                size={22}
                className={selected ? 'text-secondary' : 'text-slate-400'}
              />
              <p className="font-semibold text-slate-900 mt-2 text-sm pr-6">{eng.name}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{eng.description}</p>
            </button>
          );
        })}
      </div>

    </div>
  );
}
