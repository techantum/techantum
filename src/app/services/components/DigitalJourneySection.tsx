import Icon from '@/components/ui/AppIcon';
import { digitalTransformationJourney } from '@/lib/service-packages-data';

export default function DigitalJourneySection() {
  return (
    <section className="page-section bg-muted/30 reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Digital Transformation Partner
          </span>
          <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-4">
            Your Complete Digital Journey
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">
            Techantum Solutions partners with you long-term — from strategy through launch, growth,
            and ongoing optimization.
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4 reveal reveal-stagger">
          {digitalTransformationJourney.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2">
                <span className="font-inter text-xs font-semibold text-primary">{index + 1}</span>
                <span className="font-inter text-sm text-foreground whitespace-nowrap">{step}</span>
              </div>
              {index < digitalTransformationJourney.length - 1 && (
                <Icon
                  name="ChevronDownIcon"
                  size={16}
                  className="text-muted-foreground rotate-[-90deg] hidden sm:block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
