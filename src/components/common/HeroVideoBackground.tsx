'use client';

import { useEffect, useRef, useState } from 'react';

const VIDEO_SRC = '/videos/hero-bg.mp4';
const VIDEO_FALLBACK =
  'https://assets.mixkit.co/videos/914/914-720.mp4';
const POSTER_SRC = '/videos/hero-bg-poster.jpg';

export default function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

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
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {reduceMotion ? (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${POSTER_SRC})` }}
          aria-hidden="true"
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-105 animate-ken-burns"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER_SRC}
          aria-hidden="true"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
          <source src={VIDEO_FALLBACK} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/88 to-primary/15" />
      <div className="absolute inset-0 bg-background/25 backdrop-blur-[1px]" />
    </div>
  );
}
