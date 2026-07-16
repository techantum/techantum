'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

const REDIRECT_SECONDS = 8;

export default function ThankYouRedirect() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      router.replace('/');
    }
  }, [secondsLeft, router]);

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Icon name="CheckCircleIcon" size={36} className="text-primary" variant="solid" />
      </div>
      <h1 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-3">
        Thank You!
      </h1>
      <p className="font-inter text-lg text-muted-foreground mb-8">
        Your inquiry has been submitted successfully. Our team will get back to you within 24 hours.
      </p>
      <p className="font-inter text-sm text-muted-foreground mb-6">
        Redirecting to the home page in{' '}
        <span className="font-semibold text-foreground">{secondsLeft}</span> second
        {secondsLeft === 1 ? '' : 's'}…
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-inter font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Go to Home Now
        <Icon name="ArrowRightIcon" size={18} />
      </Link>
    </div>
  );
}
