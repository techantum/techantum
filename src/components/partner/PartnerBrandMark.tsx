'use client';

const SIZE_CLASS = {
  sm: 'h-8 max-w-[140px]',
  md: 'h-12 max-w-[200px]',
  lg: 'h-16 max-w-[260px]',
} as const;

const FALLBACK_SIZE = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-16 w-16 text-xl',
} as const;

export default function PartnerBrandMark({
  logoUrl,
  companyName,
  size = 'md',
  className = '',
}: {
  logoUrl?: string | null;
  companyName?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const name = companyName?.trim() || 'Partner';
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className={`${SIZE_CLASS[size]} w-auto object-contain ${className}`} />
    );
  }

  return (
    <div
      className={`${FALLBACK_SIZE[size]} flex items-center justify-center rounded-xl bg-brand-gradient font-bricolage font-bold text-white ${className}`}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
