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
    <section className="relative min-h-[85vh] md:min-h-screen flex items-center overflow-hidden pt-16 sm:pt-20 pb-20 md:pb-14">
      <HeroVideoBackground
        videoUrl={String(data.heroVideoUrl || '')}
        posterUrl={String(data.heroPosterUrl || '')}
        fallbackVideoUrl={String(data.heroVideoFallbackUrl || '')}
      />
      <div className="absolute inset-0 bg-black/55 z-[1]" aria-hidden />

      <div className="relative z-10 w-full page-container py-8 md:py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-6 border border-white/25 bg-black/30">
          <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
          <span className="font-inter text-xs font-medium text-white">{String(data.badge)}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start lg:items-center">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <span className="h-px w-8 sm:w-12 bg-secondary shrink-0" />
              <span className="font-inter text-xs sm:text-sm uppercase tracking-wider text-white font-medium">
                {String(data.eyebrow)}
              </span>
            </div>

            <h1 className="font-bricolage font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white leading-[1.15] mb-4 sm:mb-6">
              {String(data.titleLine1)}
              <br />
              {String(data.titleLine2)}
            </h1>

            <CmsRichText
              html={String(data.description ?? '')}
              className="font-inter text-base sm:text-lg md:text-xl text-white mb-6 sm:mb-8 max-w-2xl"
            />

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link
                href={String(data.primaryCtaHref)}
                className="w-full sm:w-auto text-center bg-primary text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-inter font-semibold text-sm sm:text-base hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg inline-flex items-center justify-center gap-2"
              >
                {String(data.primaryCta)}
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
              <Link
                href={String(data.secondaryCtaHref)}
                className="w-full sm:w-auto text-center bg-secondary text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-inter font-semibold text-sm sm:text-base hover:bg-secondary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg inline-flex items-center justify-center gap-2"
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

      <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 animate-bounce z-10">
        <span className="font-inter text-xs uppercase tracking-wider text-white/80">Scroll</span>
        <Icon name="ChevronDownIcon" size={20} className="text-white/80" />
      </div>
    </section>
  );
}
