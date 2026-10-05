type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-secondary text-white border-transparent hover:bg-[#d93b1e]',
  secondary: 'bg-white text-slate-800 border border-slate-200 hover:border-secondary/40 hover:text-secondary',
  ghost: 'text-slate-500 hover:text-secondary hover:bg-orange-50 border-transparent',
  danger: 'bg-rose-600 text-white border-transparent hover:bg-rose-700',
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
  children,
  ...props
}: AdminButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
