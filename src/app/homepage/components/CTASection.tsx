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
    <section className="page-section bg-primary reveal">
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-white mb-4">
              {String(data.title)}
            </h2>
            <CmsRichText html={String(data.description ?? '')} className="font-inter text-base text-white/85 mb-6 leading-relaxed" />
            <ul className="space-y-2.5 mb-6">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-3 text-white/90">
                  <Icon name="CheckCircleIcon" size={20} variant="solid" className="text-secondary shrink-0" />
                  <span className="font-inter text-sm">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:text-right space-y-4">
            <Link
              href={String(data.primaryCtaHref)}
              className="inline-flex items-center gap-2 bg-secondary text-white px-7 py-3 rounded-md font-inter font-semibold text-base hover:bg-secondary/90 transition-colors"
            >
              {String(data.primaryCta)}
              <Icon name="ArrowRightIcon" size={20} />
            </Link>
            <p className="font-inter text-sm text-white/80">
              {String(data.phoneLabel)}{' '}
              <a href={`tel:${branding.phone_href}`} className="font-semibold underline hover:no-underline text-white">
                {branding.phone}
              </a>
            </p>
            <div className="flex flex-wrap gap-4 justify-start lg:justify-end pt-2">
              <Link href="/services" className="font-inter text-sm font-medium text-white/90 hover:text-white hover:underline flex items-center gap-2">
                Our services
                <Icon name="ArrowRightIcon" size={18} />
              </Link>
              <Link href="/portfolio" className="font-inter text-sm font-medium text-white/90 hover:text-white hover:underline flex items-center gap-2">
                Portfolio
                <Icon name="ArrowRightIcon" size={18} />
              </Link>
              <Link href="/about" className="font-inter text-sm font-medium text-white/90 hover:text-white hover:underline flex items-center gap-2">
                About us
                <Icon name="ArrowRightIcon" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
