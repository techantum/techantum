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
    <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-muted/50 border border-border">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
