import Link from 'next/link';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PageHeroSection from '@/components/common/PageHeroSection';
import Icon from '@/components/ui/AppIcon';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import { getDivisionPath, serviceDivisions } from '@/lib/service-packages-data';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function ServicesPage() {
  const heroContent = await getCmsContent('services.hero');
  const hero = mergeCmsContent('services.hero', heroContent);

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PageHeroSection
          eyebrow={String(hero.eyebrow)}
          title={String(hero.title)}
          description={String(hero.description)}
        />

        <section className="py-8 bg-muted/50 reveal">
          <div className="page-container">
            <h2 className="font-bricolage text-3xl font-bold text-foreground mb-4 text-center reveal-fade">
              Pre-Engineered Building Solutions
            </h2>
            <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto text-center mb-10">
              From warehouses and industrial sheds to poultry farms and convention centers — KEIL
              delivers end-to-end PEB construction across India.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 reveal reveal-stagger">
              {serviceDivisions.map((service) => (
                <Link
                  key={service.slug}
                  href={getDivisionPath(service.slug)}
                  className="group bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary transition-all duration-300 hover-lift"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${service.bgClass} group-hover:opacity-90`}
                    >
                      <Icon name={service.icon as any} size={28} className={service.iconClass} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bricolage text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {service.name}
                      </h3>
                      <p className="font-inter text-sm text-muted-foreground mt-1">
                        {service.marketingMessage}
                      </p>
                      <span className="inline-flex items-center gap-1 font-inter text-sm font-medium text-primary mt-3">
                        View service details
                        <Icon name="ArrowRightIcon" size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section reveal">
          <div className="page-container text-center">
            <h2 className="font-bricolage text-3xl font-bold text-foreground mb-4">
              Ready to Start Your Project?
            </h2>
            <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto mb-5">
              Share your requirements and our team will provide a consultation and estimate within
              24 hours.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-full font-inter font-medium hover:bg-secondary/90 transition-colors"
            >
              Request a Quote
              <Icon name="ArrowRightIcon" size={20} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
