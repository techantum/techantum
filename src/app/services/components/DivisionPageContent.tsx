import Link from 'next/link';
import PageHeroSection from '@/components/common/PageHeroSection';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div>
              <h2 className="font-bricolage text-2xl font-bold text-foreground mb-4">Service Overview</h2>
              <p className="font-inter text-muted-foreground mb-6">{division.overview}</p>

              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-3">How It Works</h3>
              <p className="font-inter text-muted-foreground mb-6">{division.howItWorks}</p>

              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-3">Key Features</h3>
              <ul className="space-y-2 mb-6">
                {division.keyFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 font-inter text-sm">
                    <Icon name="CheckCircleIcon" size={18} className="text-primary shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={getContactHref(division)}
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-full font-inter font-medium text-sm hover:bg-secondary/90 transition-colors"
              >
                Request a Quote
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
        <div className="page-container grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-bricolage text-2xl font-bold text-foreground mb-4">Benefits</h2>
            <ul className="space-y-2">
              {division.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 font-inter text-sm">
                  <Icon name="CheckBadgeIcon" size={18} className="text-primary shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-bricolage text-2xl font-bold text-foreground mb-4">Industries Served</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {division.industriesServed.map((industry) => (
                <span key={industry} className="font-inter text-xs bg-card border border-border px-3 py-1.5 rounded-full">
                  {industry}
                </span>
              ))}
            </div>
            <h3 className="font-bricolage text-lg font-semibold text-foreground mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {division.categories.map((cat) => (
                <span key={cat} className="font-inter text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {division.executionProcess.length > 0 && (
        <section className="page-section reveal">
          <div className="page-container max-w-3xl">
            <h2 className="font-bricolage text-2xl font-bold text-foreground mb-6 text-center">
              Project Execution Process
            </h2>
            <ol className="space-y-3">
              {division.executionProcess.map((step, index) => (
                <li key={step} className="flex items-start gap-3 font-inter text-muted-foreground">
                  <span className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

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
