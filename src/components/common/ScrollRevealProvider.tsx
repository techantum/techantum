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

const AUTO_CARD_SELECTORS = '[data-ui-card], main .ui-card, main section.rounded-2xl.border';

function canAutoReveal(el: Element) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.classList.contains('reveal') || el.classList.contains('reveal-stagger')) return false;
  if (el.closest('.reveal-stagger, header, aside, nav, .sticky')) return false;
  if (el.classList.contains('sticky') || window.getComputedStyle(el).position === 'sticky') return false;
  return true;
}

export default function ScrollRevealProvider() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => el.classList.add('active'));
      document.querySelectorAll(AUTO_CARD_SELECTORS).forEach((el) => el.classList.add('active'));
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
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );

    const observeAll = () => {
      requestAnimationFrame(() => {
        document.querySelectorAll(AUTO_CARD_SELECTORS).forEach((el) => {
          if (canAutoReveal(el)) el.classList.add('reveal');
        });
        document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => {
          if (el.classList.contains('active')) return;
          if (el.classList.contains('page-hero')) {
            el.classList.add('active');
            return;
          }
          const rect = el.getBoundingClientRect();
          const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
          if (inView) {
            el.classList.add('active');
          } else {
            observer.observe(el);
          }
        });
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
