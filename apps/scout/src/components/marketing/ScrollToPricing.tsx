'use client';

import { useEffect } from 'react';

export default function ScrollToPricing() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('buy') !== '1') return;
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  return null;
}
