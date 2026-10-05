interface AdminFieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  span?: 1 | 2 | 3;
}

const spanClasses = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-2 lg:col-span-3',
};

export default function AdminField({
  label,
  hint,
  htmlFor,
  children,
  className = '',
  span = 1,
}: AdminFieldProps) {
  return (
    <div className={`space-y-1.5 ${spanClasses[span]} ${className}`}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const adminInputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary hover:border-slate-300';

export const adminSelectClass = adminInputClass;

export const adminTextareaClass = `${adminInputClass} resize-none min-h-[88px]`;
