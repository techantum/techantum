'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!measurementId || measurementId === 'your-google-analytics-id-here') return;

    if (!window.dataLayer) {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;
      document.head.appendChild(script);

      window.dataLayer = [];
      window.gtag = function() { dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', measurementId);
    }

    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '');
    window.gtag('event', 'page_view', { page_path: url });
  }, [pathname, searchParams]);
}

export function trackEvent(eventName: string, eventParams: Record<string, any> = {}) {
  if (process.env.NODE_ENV === 'production' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

// Track form submission conversion (GA4 recommended event)
export function trackFormConversion(formData: {
  formId: string;
  productCategory: string;
  country: string;
  value?: number;
}) {
  if (process.env.NODE_ENV === 'production' && window.gtag) {
    // Track as lead generation conversion
    window.gtag('event', 'generate_lead', {
      currency: 'EUR',
      value: formData.value || 0,
      form_id: formData.formId,
      product_category: formData.productCategory,
      country: formData.country,
    });

    // Also track custom conversion event
    window.gtag('event', 'conversion', {
      send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      event_category: 'Form',
      event_label: 'Contact Form Submission',
      value: formData.value || 0,
    });
  }
}

// Track form interactions
export function trackFormInteraction(action: 'start' | 'field_complete' | 'error', fieldName?: string) {
  if (process.env.NODE_ENV === 'production' && window.gtag) {
    window.gtag('event', 'form_interaction', {
      form_id: 'contact_form',
      action,
      field_name: fieldName,
    });
  }
}

// Type declarations for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
