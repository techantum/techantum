import { getDefaultContent } from '@/lib/cms/default-content';

export default function PartnerCountriesSection({ content }: { content?: Record<string, unknown> }) {
  const data = { ...getDefaultContent('homepage.tech_stack'), ...content };
  const technologies = (data.technologies as Array<{ id: string; name: string; icon: string }>) || [];
  const duplicatedTechnologies = [...technologies, ...technologies];

  return (
    <section className="page-section bg-muted/50 overflow-hidden reveal grid-bg">
      <div className="page-container mb-5">
        <div className="text-center">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            {String(data.eyebrow)}
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">{String(data.title)}</h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">{String(data.description)}</p>
        </div>
      </div>
      <div className="relative">
        <div className="flex gap-5 animate-marquee">
          {duplicatedTechnologies.map((tech, index) => (
            <div
              key={`${tech.id}_${index}`}
              className="flex items-center gap-4 bg-card px-8 py-4 rounded-full border border-border shadow-sm shrink-0"
            >
              <span className="text-2xl font-bold">{tech.icon}</span>
              <span className="font-inter font-semibold text-base text-foreground whitespace-nowrap">{tech.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
