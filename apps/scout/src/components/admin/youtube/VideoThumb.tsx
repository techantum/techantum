'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImagePulse } from '@/components/ui/SafeImage';

function splitImageClass(className: string) {
  const tokens = className.split(/\s+/).filter(Boolean);
  const img = tokens.filter((token) => token.startsWith('object-'));
  const wrap = tokens.filter((token) => !token.startsWith('object-'));
  return { wrap: wrap.join(' '), img: img.join(' ') || 'object-cover' };
}

export default function VideoThumb({
  youtubeId,
  src,
  className = 'h-full w-full object-cover',
  alt = '',
  priority = false,
}: {
  youtubeId?: string | null;
  src?: string | null;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const sources = useMemo(() => {
    const id = String(youtubeId || '');
    const list = [
      String(src || '').trim(),
      /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '',
      /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '',
      '/youtube/video-fallback.svg',
    ];
    return [...new Set(list.filter(Boolean))];
  }, [src, youtubeId]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [sources.join('|')]);
  const current = sources[Math.min(index, sources.length - 1)] || '/youtube/video-fallback.svg';
  const { wrap, img } = splitImageClass(className);

  return (
    <span className={`relative block overflow-hidden bg-slate-100 ${wrap || 'h-full w-full'}`}>
      {loaded ? null : <ImagePulse />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-full w-full ${img} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setIndex((value) => Math.min(value + 1, sources.length - 1));
        }}
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setLoaded(true);
        }}
      />
    </span>
  );
}
