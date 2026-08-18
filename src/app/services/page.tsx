import Link from 'next/link';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PageHeroSection from '@/components/common/PageHeroSection';
import Icon from '@/components/ui/AppIcon';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import DigitalJourneySection from './components/DigitalJourneySection';
import {
  getDivisionPath,
  serviceDivisions,
} from '@/lib/service-packages-data';

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
              Three Divisions. Nine Packages.
            </h2>
            <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto text-center mb-10">
              We sell business outcomes — not isolated services. Explore each division and find the
              package that matches your stage of growth.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 reveal reveal-stagger">
              {serviceDivisions.map((division) => (
                <Link
                  key={division.slug}
                  href={getDivisionPath(division.slug)}
                  className="group bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary transition-all duration-300 hover-lift"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${division.bgClass} group-hover:opacity-90`}
                    >
                      <Icon
                        name={division.icon as any}
                        size={28}
                        className={division.iconClass}
                      />
                    </div>
                    <h3 className="font-bricolage text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {division.name}
                    </h3>
                    <p className="font-inter text-sm text-muted-foreground">
                      {division.plans.length} packages · {division.marketingMessage}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {division.plans.map((plan) => (
                        <span
                          key={plan.slug}
                          className="font-inter text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
                        >
                          {plan.name}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 font-inter text-sm font-medium text-primary mt-2">
                      Explore packages
                      <Icon name="ArrowRightIcon" size={16} />
                    </span>
                  </div>
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
