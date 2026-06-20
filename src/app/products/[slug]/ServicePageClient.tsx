'use client';

import { useEffect } from 'react';

export default function ServicePageClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      reveals.forEach((el) => el.classList.add('active'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('active');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
    );
    reveals.forEach((el) => observer.observe(el));

    const timeout = setTimeout(() => {
      reveals.forEach((el) => el.classList.add('active'));
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return <>{children}</>;
}
