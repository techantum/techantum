'use client';

import { useEffect } from 'react';

const REVEAL_SELECTORS = [
  '.reveal',
  '.reveal-left',
  '.reveal-right',
  '.reveal-scale',
  '.reveal-fade',
  '.reveal-stagger',
].join(',');

export default function ScrollRevealProvider() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => el.classList.add('active'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    const observeAll = () => {
      document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => {
        if (el.classList.contains('active')) return;
        const rect = el.getBoundingClientRect();
        const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
        if (inView) {
          el.classList.add('active');
        } else {
          observer.observe(el);
        }
      });
    };

    observeAll();

    const mutationObserver = new MutationObserver(observeAll);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
