import Icon from '@/components/ui/AppIcon';

interface Industry {
  id: string;
  name: string;
  icon: string;
}

interface IndustriesSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  industries: Industry[];
}

export default function IndustriesSection({
  eyebrow,
  title,
  description,
  industries,
}: IndustriesSectionProps) {
  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            {eyebrow}
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 reveal reveal-stagger">
          {industries.map((industry) => (
            <div
              key={industry.id}
              className="bg-card border border-border rounded-2xl p-5 text-center hover-lift glow-card"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Icon name={industry.icon as any} size={24} className="text-primary" />
              </div>
              <p className="font-inter text-sm font-semibold text-foreground">{industry.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
