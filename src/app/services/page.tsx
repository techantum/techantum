import Link from 'next/link';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PageHeroSection from '@/components/common/PageHeroSection';
import Icon from '@/components/ui/AppIcon';
import { getCmsContent, getServiceCatalog } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import DigitalJourneySection from './components/DigitalJourneySection';
import { getDivisionPath } from '@/lib/service-packages-data';

export default async function ServicesPage() {
  const [heroContent, catalog] = await Promise.all([getCmsContent('services.hero'), getServiceCatalog()]);
  const listing = await getCmsContent('services.page');
  const hero = mergeCmsContent('services.hero', heroContent);
  const title = String(listing.title || listing.exploreTitle || hero.title);
  const description = String(listing.description || hero.description);
  const cta = String(listing.cta || '');
  const ctaHref = String(listing.ctaHref || '/contact');
  const rawCategories = Array.isArray(listing.categories) ? listing.categories : [];
  const categories = rawCategories
    .filter((item) => item && typeof item === 'object' && (item as { published?: boolean }).published !== false)
    .map((item) => item as Record<string, unknown>);
  const cards = categories.length
    ? categories.map((category) => ({
        id: String(category.id || category.name),
        name: String(category.name || ''),
        description: String(category.description || ''),
        href: String(category.href || '/services'),
        icon: String(category.icon || 'CubeIcon'),
        iconClass: String(category.iconClass || 'text-primary'),
        bgClass: String(category.bgClass || 'bg-primary/10'),
        offerings: String(category.offerings || ''),
      }))
    : catalog.map((division) => ({
        id: division.slug,
        name: division.name,
        description: division.marketingMessage,
        href: getDivisionPath(division.slug),
        icon: division.icon,
        iconClass: division.iconClass,
        bgClass: division.bgClass,
        offerings: String(division.plans.length),
      }));

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PageHeroSection
          eyebrow={String(hero.eyebrow || 'Our Services')}
          title={title}
          description={description}
        />

        <section className="py-8 bg-muted/50 reveal">
          <div className="page-container">
            <h2 className="font-bricolage text-3xl font-bold text-foreground mb-4 text-center reveal-fade">
              {title}
            </h2>
            <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto text-center mb-6">
              {description}
            </p>
            {cta ? (
              <div className="mb-10 text-center">
                <Link href={ctaHref} className="inline-flex rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-white">
                  {cta}
                </Link>
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 reveal reveal-stagger">
              {cards.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className="group bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary transition-all duration-300 hover-lift"
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${card.bgClass}`}>
                    <Icon name={card.icon as any} size={28} className={card.iconClass} />
                  </div>
                  <h3 className="mt-4 font-bricolage text-xl font-semibold text-foreground group-hover:text-primary">
                    {card.name}
                  </h3>
                  <p className="mt-2 font-inter text-sm text-muted-foreground">{card.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 font-inter text-sm font-medium text-primary">
                    {card.offerings ? `${card.offerings} offerings` : 'Explore'}
                    <Icon name="ArrowRightIcon" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <DigitalJourneySection />

        <section className="page-section reveal">
          <div className="page-container text-center">
            <h2 className="font-bricolage text-3xl font-bold text-foreground mb-4">
              Ready to Start Your Digital Journey?
            </h2>
            <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto mb-5">
              Book a free consultation. We&apos;ll analyze your requirements and deliver a tailored
              proposal within 48 hours.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-full font-inter font-medium hover:bg-secondary/90 transition-colors"
            >
              Book Free Consultation
              <Icon name="ArrowRightIcon" size={20} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
