import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import HeroVideoBackground from '@/components/common/HeroVideoBackground';
import CmsRichText from '@/components/cms/CmsRichText';
import { mergeCmsContent } from '@/lib/cms/default-content';
import HeroContactForm from './HeroContactForm';

export default function HeroSection({ content }: { content?: Record<string, unknown> }) {
  const data = mergeCmsContent('homepage.hero', content);
  const serviceOptions = ((data.serviceOptions as string[]) || [
    'Websites',
    'Web Applications',
    'Mobile Applications',
    'Other',
  ]);

  return (
    <section className="relative min-h-[80vh] md:min-h-[85vh] flex items-center overflow-hidden pt-16 sm:pt-20 pb-16 md:pb-14">
      <HeroVideoBackground
        videoUrl={String(data.heroVideoUrl || '')}
        posterUrl={String(data.heroPosterUrl || '')}
        fallbackVideoUrl={String(data.heroVideoFallbackUrl || '')}
      />
      <div className="absolute inset-0 bg-slate-950/70 z-[1]" aria-hidden />

      <div className="relative z-10 w-full page-container py-8 md:py-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md mb-6 border border-white/20 bg-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
          <span className="font-inter text-xs font-medium text-white tracking-wide">{String(data.badge)}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start lg:items-center">
          <div className="lg:col-span-7">
            <div className="mb-4 sm:mb-5">
              <span className="font-inter text-xs sm:text-sm uppercase tracking-widest text-white/80 font-medium">
                {String(data.eyebrow)}
              </span>
            </div>

            <h1 className="font-bricolage font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-4 sm:mb-6">
              {String(data.titleLine1)}
              <br />
              {String(data.titleLine2)}
            </h1>

            <CmsRichText
              html={String(data.description ?? '')}
              className="font-inter text-base sm:text-lg text-white/90 mb-8 max-w-2xl leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href={String(data.primaryCtaHref)}
                className="w-full sm:w-auto text-center bg-secondary text-white px-6 sm:px-7 py-3 rounded-md font-inter font-semibold text-sm sm:text-base hover:bg-secondary/90 transition-colors inline-flex items-center justify-center gap-2"
              >
                {String(data.primaryCta)}
                <Icon name="ArrowRightIcon" size={18} />
              </Link>
              <Link
                href={String(data.secondaryCtaHref)}
                className="w-full sm:w-auto text-center bg-white/10 text-white border border-white/30 px-6 sm:px-7 py-3 rounded-md font-inter font-semibold text-sm sm:text-base hover:bg-white/15 transition-colors inline-flex items-center justify-center"
              >
                {String(data.secondaryCta)}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <HeroContactForm
              title={String(data.cardTitle || 'How can we help you?')}
              serviceOptions={serviceOptions}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
