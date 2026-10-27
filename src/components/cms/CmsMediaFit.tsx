import SafeImage from '@/components/ui/SafeImage';

interface CmsMediaFitProps {
  src: string;
  alt?: string;
  kind: 'image' | 'video';
  className?: string;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
  poster?: string;
}

/** Renders image/video fitted inside its container without overflow. */
export default function CmsMediaFit({
  src,
  alt = '',
  kind,
  className = '',
  videoProps,
  poster,
}: CmsMediaFitProps) {
  const fitClass = `block w-full h-full max-w-full max-h-full object-cover object-center ${className}`;

  if (!src) return null;

  if (kind === 'video') {
    return (
      <video
        src={src}
        poster={poster}
        className={fitClass}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        {...videoProps}
      />
    );
  }

  return <SafeImage src={src} alt={alt} className={fitClass} loading="lazy" />;
}
