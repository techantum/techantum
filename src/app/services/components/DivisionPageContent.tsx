import Link from 'next/link';
import PageHeroSection from '@/components/common/PageHeroSection';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import PlanCard from './PlanCard';
import PackageComparisonTable from './PackageComparisonTable';
import type { ServiceDivision } from '@/lib/service-packages-data';
import { getContactHref } from '@/lib/service-packages-data';

export default function DivisionPageContent({ division }: { division: ServiceDivision }) {
  return (
    <>
      <PageHeroSection
        eyebrow={division.eyebrow}
        title={division.title}
        description={division.description}
      />

      <section className="py-8 reveal">
        <div className="page-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${division.bgClass}`}
                >
                  <Icon name={division.icon as any} size={24} className={division.iconClass} />
                </div>
                <h2 className="font-bricolage text-2xl font-bold text-foreground">
                  {division.marketingMessage}
                </h2>
              </div>
              <p className="font-inter text-muted-foreground mb-6">
                We focus on business outcomes — not just technology. Every package is designed to
                deliver measurable results for your industry.
              </p>

              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-3">
                Core Benefits
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                {division.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 font-inter text-sm">
                    <Icon name="CheckCircleIcon" size={18} className="text-primary shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-3">
                Suitable to
              </h3>
              <div className="flex flex-wrap gap-2 mb-5">
                {division.targetAudience.map((audience) => (
                  <span
                    key={audience}
                    className="font-inter text-xs bg-muted text-foreground px-3 py-1.5 rounded-full"
                  >
                    {audience}
                  </span>
                ))}
              </div>

              <Link
                href={getContactHref(division)}
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-full font-inter font-medium text-sm hover:bg-secondary/90 transition-colors"
              >
                Book Free Consultation
                <Icon name="ArrowRightIcon" size={18} />
              </Link>
            </div>

            <div className="relative h-72 lg:h-96 rounded-2xl overflow-hidden">
              <AppImage
                src={division.image}
                alt={division.imageAlt}
                width={800}
                height={500}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-section bg-muted/50 reveal">
        <div className="page-container">
          <div className="text-center mb-5">
            <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
              Service Packages
            </span>
            <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-4">
              {division.packagesHeadline}
            </h2>
            <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the package that matches your business maturity. Each plan includes a clear
              scope and path to upgrade as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 reveal reveal-stagger">
            {division.plans.map((plan) => (
              <PlanCard key={plan.slug} division={division} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <PackageComparisonTable division={division} />

      <section className="py-8 reveal">
        <div className="page-container text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon name="ArrowLeftIcon" size={16} />
            Back to all services
          </Link>
        </div>
      </section>
    </>
  );
}
