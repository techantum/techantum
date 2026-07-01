'use client';

import { useEffect, useRef, useState } from 'react';
import CmsMediaFit from '@/components/cms/CmsMediaFit';

const DEFAULT_VIDEO = '/videos/hero-bg.mp4';
const DEFAULT_POSTER = '/videos/hero-bg-poster.jpg';
const DEFAULT_FALLBACK = 'https://assets.mixkit.co/videos/19639/19639-720.mp4';

interface HeroVideoBackgroundProps {
  videoUrl?: string;
  posterUrl?: string;
  fallbackVideoUrl?: string;
}

export default function HeroVideoBackground({
  videoUrl = DEFAULT_VIDEO,
  posterUrl = DEFAULT_POSTER,
  fallbackVideoUrl = DEFAULT_FALLBACK,
}: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeSrc, setActiveSrc] = useState(videoUrl || DEFAULT_VIDEO);

  useEffect(() => {
    setActiveSrc(videoUrl || DEFAULT_VIDEO);
  }, [videoUrl]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(motionQuery.matches);

    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    motionQuery.addEventListener('change', onChange);

    const video = videoRef.current;
    if (!video || motionQuery.matches) return;

    const play = () => {
      video.play().catch(() => {
        /* autoplay blocked — poster remains visible */
      });
    };

    if (video.readyState >= 2) play();
    else video.addEventListener('loadeddata', play, { once: true });

    return () => {
      motionQuery.removeEventListener('change', onChange);
      video.removeEventListener('loadeddata', play);
    };
  }, [activeSrc, reduceMotion]);

  const poster = posterUrl || DEFAULT_POSTER;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {reduceMotion ? (
        <div className="absolute inset-0 overflow-hidden">
          <CmsMediaFit src={poster} kind="image" alt="" />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <video
            ref={videoRef}
            key={activeSrc}
            className="block w-full h-full max-w-full max-h-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={poster}
            aria-hidden="true"
            onError={() => {
              if (fallbackVideoUrl && activeSrc !== fallbackVideoUrl) {
                setActiveSrc(fallbackVideoUrl);
              }
            }}
          >
            <source src={activeSrc} type="video/mp4" />
            {fallbackVideoUrl && activeSrc !== fallbackVideoUrl && (
              <source src={fallbackVideoUrl} type="video/mp4" />
            )}
          </video>
        </div>
      )}
    </div>
  );
}
