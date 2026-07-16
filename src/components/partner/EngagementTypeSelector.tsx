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
  const selectedEngagement = ENGAGEMENT_TYPES.find((e) => e.slug === value);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-slate-900">Client Requirement Type</h2>
          <p className="text-sm text-slate-500 mt-1">
            Optional — select if the client needs a focused engagement beyond the standard service package.
            The form fields will update to match your selection.
          </p>
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 shrink-0">
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
              ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-100'
              : 'border-slate-200 hover:border-indigo-200 bg-white'
          }`}
        >
          <Icon
            name="CubeIcon"
            size={22}
            className={!value ? 'text-indigo-600' : 'text-slate-400'}
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
                  ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-100'
                  : 'border-slate-200 hover:border-indigo-200 bg-white'
              }`}
            >
              {selected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Icon name="CheckIcon" size={12} />
                </span>
              )}
              <Icon
                name={eng.icon as 'RocketLaunchIcon'}
                size={22}
                className={selected ? 'text-indigo-600' : 'text-slate-400'}
              />
              <p className="font-semibold text-slate-900 mt-2 text-sm pr-6">{eng.name}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{eng.description}</p>
            </button>
          );
        })}
      </div>

      {selectedEngagement && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
          <Icon name="InformationCircleIcon" size={18} className="text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-900">
            Showing fields tailored for <strong>{selectedEngagement.name}</strong>. Business, project,
            and functional questions below reflect this requirement type.
          </p>
        </div>
      )}
    </div>
  );
}
