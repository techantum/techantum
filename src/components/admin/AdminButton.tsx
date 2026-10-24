type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline-danger' | 'success';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-secondary text-white border-transparent hover:bg-[#d93b1e]',
  secondary: 'bg-white text-slate-800 border border-slate-200 hover:border-secondary/40 hover:text-secondary',
  ghost: 'text-slate-500 hover:text-secondary hover:bg-orange-50 border-transparent',
  danger: 'bg-rose-600 text-white border-transparent hover:bg-rose-700',
  'outline-danger': 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
  success: 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function AdminButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled,
  loading = false,
  children,
  type = 'button',
  ...props
}: AdminButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ui-btn inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}
