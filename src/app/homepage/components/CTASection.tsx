import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import CmsRichText from '@/components/cms/CmsRichText';
import { getDefaultContent, defaultBranding } from '@/lib/cms/default-content';
import type { SiteBranding } from '@/lib/cms/types';

export default function CTASection({
  content,
  branding = defaultBranding,
}: {
  content?: Record<string, unknown>;
  branding?: SiteBranding;
}) {
  const data = { ...getDefaultContent('homepage.cta'), ...content };
  const bullets = (data.bullets as string[]) || [];

  return (
    <section className="page-section bg-brand-gradient reveal relative overflow-hidden">
      <div className="absolute inset-0 bg-black/20" aria-hidden />
      <div className="page-container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
          <div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-white mb-4">
              {String(data.title)}
            </h2>
            <CmsRichText html={String(data.description ?? '')} className="font-inter text-lg text-white mb-6" />
            <ul className="space-y-3 mb-5">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-3 text-white">
                  <Icon name="CheckCircleIcon" size={24} variant="solid" className="text-white shrink-0" />
                  <span className="font-inter text-base">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:text-right space-y-4">
            <Link
              href={String(data.primaryCtaHref)}
              className="inline-flex items-center gap-2 bg-secondary text-white px-8 py-4 rounded-full font-inter font-semibold text-lg hover:bg-secondary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              {String(data.primaryCta)}
              <Icon name="ArrowRightIcon" size={24} />
            </Link>
            <p className="font-inter text-sm text-white">
              {String(data.phoneLabel)}{' '}
              <a href={`tel:${branding.phone_href}`} className="font-semibold underline hover:no-underline text-white">
                {branding.phone}
              </a>
            </p>
            <div className="flex flex-wrap gap-4 justify-start lg:justify-end pt-4">
              <Link href="/services" className="font-inter text-base font-medium text-white hover:underline flex items-center gap-2">
                Explore Our Services
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
              <Link href="/portfolio" className="font-inter text-base font-medium text-white hover:underline flex items-center gap-2">
                View Our Portfolio
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
              <Link href="/about" className="font-inter text-base font-medium text-white hover:underline flex items-center gap-2">
                About TechAntum
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
