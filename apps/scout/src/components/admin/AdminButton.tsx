'use client';

import { useEffect, useRef } from 'react';
import { useProcess } from '@/components/ui/ProcessOverlay';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline-danger' | 'success';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  process?: string | false;
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
  process,
  children,
  type = 'button',
  onClick,
  ...props
}: AdminButtonProps) {
  const overlay = useProcess();
  const shown = useRef(false);
  const message = process === false ? '' : process || 'Working…';

  useEffect(() => {
    if (process === false) return;
    if (loading && !shown.current) {
      overlay.begin(message);
      shown.current = true;
    } else if (!loading && shown.current) {
      overlay.end();
      shown.current = false;
    }
  }, [loading, message, overlay, process]);

  useEffect(() => () => {
    if (shown.current) overlay.end();
  }, [overlay]);

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(event) => {
        const result = onClick?.(event);
        if (process === false || !result || typeof (result as Promise<unknown>).then !== 'function') return;
        void overlay.run(message, async () => { await result; });
      }}
      className={`${variants[variant]} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
    >
      {loading ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}
