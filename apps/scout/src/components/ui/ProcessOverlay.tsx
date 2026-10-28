'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import Icon from '@/components/ui/AppIcon';

type ProcessApi = {
  active: boolean;
  message: string;
  begin: (message?: string) => void;
  end: () => void;
  run: <T>(message: string, work: () => Promise<T> | T) => Promise<T>;
};

const ProcessContext = createContext<ProcessApi>({
  active: false,
  message: '',
  begin: () => undefined,
  end: () => undefined,
  run: async (_message, work) => work(),
});

export function useProcess() {
  return useContext(ProcessContext);
}

export function ProcessProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('Working…');
  const depth = useRef(0);

  const begin = useCallback((next = 'Working…') => {
    depth.current += 1;
    setMessage(next);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (!depth.current) setActive(false);
  }, []);

  const run = useCallback(async <T,>(next: string, work: () => Promise<T> | T) => {
    begin(next);
    try {
      return await work();
    } finally {
      end();
    }
  }, [begin, end]);

  const value = useMemo(() => ({ active, message, begin, end, run }), [active, message, begin, end, run]);

  return (
    <ProcessContext.Provider value={value}>
      {children}
      {active ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]" role="status" aria-live="polite">
          <div className="flex min-w-[16rem] max-w-sm flex-col items-center rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
            <span className="relative mb-4 inline-flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-600" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-violet-50" />
              <Icon name="SparklesIcon" size={22} className="relative text-violet-600" />
            </span>
            <p className="font-bricolage text-lg font-semibold text-slate-900">{message}</p>
            <p className="mt-1 text-xs text-slate-400">This only stays up while the request is running.</p>
          </div>
        </div>
      ) : null}
    </ProcessContext.Provider>
  );
}
