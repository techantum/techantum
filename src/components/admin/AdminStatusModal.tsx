'use client';

import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';

type StatusVariant = 'success' | 'error' | 'info';

const tones: Record<StatusVariant, { panel: string; icon: string; iconName: string }> = {
  success: { panel: 'border-emerald-200', icon: 'bg-emerald-50 text-emerald-600', iconName: 'CheckCircleIcon' },
  error: { panel: 'border-rose-200', icon: 'bg-rose-50 text-rose-600', iconName: 'XCircleIcon' },
  info: { panel: 'border-sky-200', icon: 'bg-sky-50 text-sky-600', iconName: 'InformationCircleIcon' },
};

export default function AdminStatusModal({
  open,
  title,
  message,
  variant = 'success',
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  variant?: StatusVariant;
  onClose: () => void;
}) {
  if (!open) return null;
  const tone = tones[variant];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className={`relative w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl ${tone.panel}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-status-title"
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
        >
          <Icon name="XMarkIcon" size={18} />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
            <Icon name={tone.iconName} size={22} />
          </span>
          <div>
            <h2 id="admin-status-title" className="font-bricolage text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <AdminButton variant="primary" onClick={onClose}>
            Close
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
