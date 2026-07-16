type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border border-indigo-600',
  secondary: 'bg-white text-foreground border border-border hover:bg-muted/60 hover:border-indigo-200',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600',
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
  children,
  ...props
}: AdminButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
