'use client';

import { useEffect, useRef } from 'react';

const VIDEO_SRC =
  'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-1728-large.mp4';
const POSTER_SRC =
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=80';

export default function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const play = () => {
      video.play().catch(() => {
        /* autoplay blocked — poster remains visible */
      });
    };

    if (video.readyState >= 2) play();
    else video.addEventListener('loadeddata', play, { once: true });

    return () => video.removeEventListener('loadeddata', play);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
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
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-primary/10" />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" />
    </div>
  );
}
