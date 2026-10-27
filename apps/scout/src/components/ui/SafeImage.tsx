'use client';

import { useState } from 'react';

export default function SafeImage({
  src,
  alt = '',
  className = '',
  fallback = null,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const url = typeof src === 'string' ? src.trim() : '';
  if (!url || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={url}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
