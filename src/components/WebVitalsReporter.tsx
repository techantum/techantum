'use client';

import { useReportWebVitals } from 'next/web-vitals';

/** Reports Core Web Vitals to Google Analytics when configured. */
export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!id || typeof window === 'undefined') return;

    const body = {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    };

    if (typeof window.gtag === 'function') {
      window.gtag('event', metric.name, body);
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[CWV] ${metric.name}:`, metric.value, metric.rating);
    }
  });

  return null;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
