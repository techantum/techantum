import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import CmsRichText from '@/components/cms/CmsRichText';
import { getDefaultContent } from '@/lib/cms/default-content';

export default function ProductCategoriesSection({ content }: { content?: Record<string, unknown> }) {
  const data = { ...getDefaultContent('homepage.services'), ...content };
  const services = (data.services as Array<{
    id: string;
    name: string;
    description: string;
    image: string;
    imageAlt: string;
    href: string;
    icon: string;
  }>) || [];

  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            {String(data.eyebrow)}
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">{String(data.title)}</h2>
          <CmsRichText html={String(data.description ?? '')} className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 reveal reveal-stagger">
          {services.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              className="group bg-card rounded-2xl overflow-hidden shadow-sm hover-lift glow-card border border-border"
            >
              <div className="relative h-64 overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={service.image}
                  alt={service.imageAlt}
                  className="absolute inset-0 w-full h-full object-cover object-center max-w-full max-h-full"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={service.icon as any} size={20} className="text-white" />
                    <h3 className="font-bricolage text-2xl font-bold text-white">{service.name}</h3>
                  </div>
                  <p className="font-inter text-sm text-white/90">{service.description}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="font-inter text-sm font-medium text-primary">Learn More</span>
                  <Icon name="ArrowRightIcon" size={20} className="text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
