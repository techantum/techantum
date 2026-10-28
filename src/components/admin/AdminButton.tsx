type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline-danger' | 'success';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  'outline-danger': 'btn-secondary text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
  success: 'btn-primary bg-emerald-600 hover:bg-emerald-500',
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
      className={`${variants[variant]} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
    >
      {loading ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}
