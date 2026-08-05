import { getDefaultContent } from '@/lib/cms/default-content';

export default function PartnerCountriesSection({ content }: { content?: Record<string, unknown> }) {
  const data = { ...getDefaultContent('homepage.tech_stack'), ...content };
  const technologies = (data.technologies as Array<{ id: string; name: string; icon: string }>) || [];

  return (
    <section className="page-section bg-muted/40 reveal">
      <div className="page-container">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <span className="font-inter text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3 block">
            {String(data.eyebrow)}
          </span>
          <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-3">
            {String(data.title)}
          </h2>
          <p className="font-inter text-base text-muted-foreground">{String(data.description)}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
          {technologies.map((tech) => (
            <div
              key={tech.id}
              className="bg-card px-4 py-3 rounded-lg border border-border text-center"
            >
              <span className="font-inter font-medium text-sm text-foreground">{tech.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
