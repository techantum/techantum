type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-md shadow-indigo-500/25 hover:brightness-110 border-transparent',
  secondary: 'bg-white/90 text-slate-800 border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200',
  ghost: 'text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border-transparent',
  danger: 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20 border-transparent hover:brightness-110',
  success: 'text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20 border-transparent hover:brightness-110',
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
