import Link from 'next/link';
import PageHeroSection from '@/components/common/PageHeroSection';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import type { ServiceDivision, ServicePlan } from '@/lib/service-packages-data';
import { getContactHref, getDivisionPath, getPlanPath } from '@/lib/service-packages-data';

function FeatureList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-bricolage text-xl font-semibold text-foreground mb-4">{title}</h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 font-inter text-sm text-foreground">
            <Icon name="CheckCircleIcon" size={18} className="text-primary shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PlanPageContent({
  division,
  plan,
}: {
  division: ServiceDivision;
  plan: ServicePlan;
}) {
  const otherPlans = division.plans.filter((p) => p.slug !== plan.slug);

  return (
    <>
      <PageHeroSection
        eyebrow={`${division.shortName} · ${plan.bestFor}`}
        title={plan.name}
        description={plan.description}
      />

      <section className="py-8 reveal">
        <div className="page-container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {plan.scope && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-1">
                    Package Scope
                  </p>
                  <p className="font-bricolage text-xl font-semibold text-foreground">{plan.scope}</p>
                </div>
              )}

              {plan.includes && <FeatureList title="What's Included" items={plan.includes} />}
              {plan.solutions && <FeatureList title="Typical Solutions" items={plan.solutions} />}
              {plan.features && !plan.includes && (
                <FeatureList title="Features" items={plan.features} />
              )}
              {plan.features && plan.solutions && (
                <FeatureList title="Features" items={plan.features} />
              )}
            </div>

            <div className="space-y-4">
              <div className="relative h-56 rounded-2xl overflow-hidden">
                <AppImage
                  src={plan.image}
                  alt={plan.imageAlt}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 sticky top-24">
                <p className="font-inter text-sm text-muted-foreground mb-2">{plan.tagline}</p>
                <p className="font-inter text-sm text-foreground mb-6">
                  Get a customized proposal with transparent pricing and implementation timeline.
                </p>
                <div className="space-y-3">
                  <Link
                    href={getContactHref(division, plan)}
                    className="flex items-center justify-center gap-2 w-full bg-secondary text-secondary-foreground px-5 py-3 rounded-full font-inter font-medium text-sm hover:bg-secondary/90 transition-colors"
                  >
                    Book Free Consultation
                    <Icon name="ArrowRightIcon" size={18} />
                  </Link>
                  <Link
                    href={getContactHref(division, plan)}
                    className="flex items-center justify-center gap-2 w-full border border-border text-foreground px-5 py-3 rounded-full font-inter font-medium text-sm hover:bg-muted transition-colors"
                  >
                    Request Proposal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {otherPlans.length > 0 && (
        <section className="page-section bg-muted/50 reveal">
          <div className="page-container">
            <h2 className="font-bricolage text-2xl font-bold text-foreground mb-6 text-center">
              Other {division.shortName} Packages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {otherPlans.map((other) => (
                <Link
                  key={other.slug}
                  href={getPlanPath(division.slug, other.slug)}
                  className="flex items-center justify-between bg-card border border-border rounded-xl p-5 hover:border-primary hover-lift transition-all"
                >
                  <div>
                    <p className="font-bricolage font-semibold text-foreground">{other.name}</p>
                    <p className="font-inter text-sm text-muted-foreground">{other.bestFor}</p>
                  </div>
                  <Icon name="ArrowRightIcon" size={20} className="text-primary" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-8 reveal">
        <div className="page-container flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={getDivisionPath(division.slug)}
            className="inline-flex items-center gap-2 font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon name="ArrowLeftIcon" size={16} />
            All {division.name} packages
          </Link>
          <span className="text-muted-foreground hidden sm:inline">·</span>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View all services
          </Link>
        </div>
      </section>
    </>
  );
}
