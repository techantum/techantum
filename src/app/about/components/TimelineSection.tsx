import type { AboutMilestone } from '@/lib/about-data';

interface TimelineSectionProps {
  title: string;
  description: string;
  milestones: AboutMilestone[];
}

export default function TimelineSection({ title, description, milestones }: TimelineSectionProps) {
  return (
    <section className="page-section bg-muted reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">{description}</p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border hidden md:block" />

          <div className="space-y-8 reveal reveal-stagger">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`flex flex-col md:flex-row items-center gap-4 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                  <div className="bg-card p-4 rounded-2xl shadow-sm border border-border inline-block">
                    <span className="font-bricolage text-2xl font-bold text-primary">{milestone.year}</span>
                    <h3 className="font-bricolage text-xl font-semibold text-foreground mt-2 mb-1">
                      {milestone.title}
                    </h3>
                    <p className="font-inter text-sm text-muted-foreground">{milestone.description}</p>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full bg-primary border-4 border-background shrink-0 hidden md:block" />
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
