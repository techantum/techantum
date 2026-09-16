type AlertVariant = 'success' | 'error' | 'info';

interface AdminAlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
}

const variants: Record<AlertVariant, string> = {
  success: 'text-emerald-900 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200',
  error: 'text-rose-900 bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200',
  info: 'text-sky-900 bg-gradient-to-r from-sky-50 to-cyan-50 border-sky-200',
};

export default function AdminAlert({ children, variant = 'success' }: AdminAlertProps) {
  return (
    <p className={`text-sm border rounded-2xl px-4 py-3 shadow-sm ${variants[variant]}`}>{children}</p>
  );
}
