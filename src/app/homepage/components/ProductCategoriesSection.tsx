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
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <span className="font-inter text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3 block">
            {String(data.eyebrow)}
          </span>
          <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-3">{String(data.title)}</h2>
          <CmsRichText html={String(data.description ?? '')} className="font-inter text-base text-muted-foreground" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 reveal reveal-stagger">
          {services.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              className="group bg-card rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors"
            >
              <div className="relative h-52 overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={service.image}
                  alt={service.imageAlt}
                  className="absolute inset-0 w-full h-full object-cover object-center max-w-full max-h-full"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name={service.icon as any} size={18} className="text-white" />
                    <h3 className="font-bricolage text-xl font-bold text-white">{service.name}</h3>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <p className="font-inter text-sm text-muted-foreground mb-4 leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-inter text-sm font-medium text-primary">View service details</span>
                  <Icon name="ArrowRightIcon" size={18} className="text-primary group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
