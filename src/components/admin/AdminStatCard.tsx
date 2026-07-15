interface AdminStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'amber' | 'blue' | 'green';
}

const accentClasses = {
  default: 'text-foreground',
  amber: 'text-amber-700',
  blue: 'text-blue-700',
  green: 'text-green-700',
};

export default function AdminStatCard({ label, value, hint, accent = 'default' }: AdminStatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${accentClasses[accent]}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
