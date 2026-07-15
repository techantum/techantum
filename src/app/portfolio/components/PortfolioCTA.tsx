import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import CmsRichText from '@/components/cms/CmsRichText';

interface PortfolioCTAProps {
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
}

export default function PortfolioCTA({ title, description, ctaText, ctaHref }: PortfolioCTAProps) {
  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="bg-brand-gradient rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative z-10">
            <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              {title}
            </h2>
            <CmsRichText
              html={description}
              className="font-inter text-lg text-primary-foreground/90 max-w-2xl mx-auto mb-8"
            />
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-card text-foreground px-8 py-4 rounded-full font-inter font-semibold hover:bg-card/90 transition-all hover-lift btn-shine shadow-lg"
            >
              {ctaText}
              <Icon name="ArrowRightIcon" size={20} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
