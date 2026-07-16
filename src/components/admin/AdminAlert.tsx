type AlertVariant = 'success' | 'error' | 'info';

interface AdminAlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
}

const variants: Record<AlertVariant, string> = {
  success: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  error: 'text-rose-800 bg-rose-50 border-rose-200',
  info: 'text-sky-800 bg-sky-50 border-sky-200',
};

export default function AdminAlert({ children, variant = 'success' }: AdminAlertProps) {
  return (
    <p className={`text-sm border rounded-xl px-4 py-3 shadow-sm ${variants[variant]}`}>{children}</p>
  );
}
