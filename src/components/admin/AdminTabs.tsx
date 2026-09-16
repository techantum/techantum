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
    <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/70 border border-indigo-100 shadow-sm">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20'
                : 'text-slate-500 hover:text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
