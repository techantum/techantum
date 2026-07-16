'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/AppIcon';

const AUTO_HIDE_MS = 5000;

export type FormToastPayload = {
  type: 'success' | 'error';
  title: string;
  message: string;
};

function FormToastPopup({
  toast,
  onClose,
}: {
  toast: FormToastPayload;
  onClose: () => void;
}) {
  const isSuccess = toast.type === 'success';

  return createPortal(
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-20 sm:top-24 right-4 z-[9999] w-[min(calc(100vw-2rem),380px)] rounded-xl border shadow-lg p-4 flex items-start gap-3 ${
        isSuccess
          ? 'bg-white border-success/40 ring-1 ring-success/10'
          : 'bg-white border-red-200 ring-1 ring-red-100'
      }`}
    >
      <Icon
        name={isSuccess ? 'CheckCircleIcon' : 'ExclamationCircleIcon'}
        size={22}
        variant="solid"
        className={`shrink-0 mt-0.5 ${isSuccess ? 'text-success' : 'text-red-600'}`}
      />
      <div className="flex-1 min-w-0 pr-1">
        <p className={`font-inter font-semibold text-sm ${isSuccess ? 'text-success' : 'text-red-600'}`}>
          {toast.title}
        </p>
        <p className="font-inter text-sm text-muted-foreground mt-0.5 leading-snug">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Close notification"
      >
        <Icon name="XMarkIcon" size={18} />
      </button>
    </div>,
    document.body
  );
}

export function useFormToast() {
  const [toast, setToast] = useState<FormToastPayload | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  const showSuccess = useCallback((message: string, title = 'Success') => {
    setToast({ type: 'success', title, message });
  }, []);

  const showError = useCallback((message: string, title = 'Failed') => {
    setToast({ type: 'error', title, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(closeToast, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [toast, closeToast]);

  const Toast = mounted && toast ? <FormToastPopup toast={toast} onClose={closeToast} /> : null;

  return { showSuccess, showError, closeToast, Toast };
}
