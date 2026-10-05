'use client';

interface AdminTab {
  id: string;
  label: string;
  icon?: string;
}

interface AdminTabsProps {
  tabs: AdminTab[];
  active: string;
  onChange: (id: string) => void;
}

export default function AdminTabs({ tabs, active, onChange }: AdminTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive ? 'bg-secondary text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-secondary'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
