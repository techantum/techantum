'use client';

import { useEffect, useMemo, useState } from 'react';

export default function VideoThumb({
  youtubeId,
  src,
  className = 'h-full w-full object-cover',
  alt = '',
}: {
  youtubeId?: string | null;
  src?: string | null;
  className?: string;
  alt?: string;
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
  useEffect(() => setIndex(0), [sources.join('|')]);
  const current = sources[Math.min(index, sources.length - 1)] || '/youtube/video-fallback.svg';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => setIndex((value) => Math.min(value + 1, sources.length - 1))}
    />
  );
}
