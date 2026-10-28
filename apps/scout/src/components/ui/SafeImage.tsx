'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

function splitImageClass(className: string) {
  const tokens = className.split(/\s+/).filter(Boolean);
  const img = tokens.filter((token) => token.startsWith('object-'));
  const wrap = tokens.filter((token) => !token.startsWith('object-'));
  return { wrap: wrap.join(' '), img: img.join(' ') || 'object-cover' };
}

export function ImagePulse() {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-200">
      <span className="absolute inset-0 bg-slate-200" />
      <span className="absolute inset-y-0 w-1/3 animate-[pulse_0.7s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </span>
  );
}

export default function SafeImage({
  src,
  alt = '',
  className = '',
  fallback = null,
  priority = false,
  loading,
  sizes,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallback?: React.ReactNode; priority?: boolean; sizes?: string }) {
  const url = typeof src === 'string' ? src.trim() : '';
  const { wrap, img } = splitImageClass(className);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fills = /\bh-full\b/.test(wrap) || /\bw-full\b/.test(wrap) || /\baspect-/.test(wrap);
  const autoWidth = /\bw-auto\b/.test(wrap);
  const needsMinHeight = /\bw-full\b/.test(wrap) && !/\bh-/.test(wrap) && !/\baspect-/.test(wrap);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [url]);

  if (!url || failed) {
    if (!fallback) {
      return (
        <span className={`relative overflow-hidden bg-slate-100 ${wrap || 'block h-full w-full'}`}>
          <ImagePulse />
        </span>
      );
    }
    return <>{fallback}</>;
  }

  return (
    <span className={`relative overflow-hidden ${fills ? 'block h-full w-full' : 'inline-block'} ${wrap} ${!loaded && autoWidth ? 'min-w-[3rem]' : ''} ${!loaded && needsMinHeight ? 'min-h-[12rem]' : ''}`}>
      {loaded ? null : <ImagePulse />}
      {url.startsWith('/') && !url.startsWith('//') && !autoWidth ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes={sizes || '(max-width: 768px) 100vw, 50vw'}
          priority={priority}
          className={`relative z-[1] h-full w-full ${img} ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...props}
          src={url}
          alt={alt}
          loading={priority ? 'eager' : loading || 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          className={`relative z-[1] h-full w-full ${img} ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setLoaded(true);
          }}
        />
      )}
    </span>
  );
}
