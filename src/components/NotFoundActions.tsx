'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface NotFoundActionsProps {
  primaryCta: string;
  primaryCtaHref: string;
  secondaryCta: string;
}

export default function NotFoundActions({
  primaryCta,
  primaryCtaHref,
  secondaryCta,
}: NotFoundActionsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        <Icon name="ArrowLeftIcon" size={16} />
        {secondaryCta}
      </button>
      <Link
        href={primaryCtaHref}
        className="inline-flex items-center justify-center gap-2 border border-border bg-background text-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Icon name="HomeIcon" size={16} />
        {primaryCta}
      </Link>
    </div>
  );
}
