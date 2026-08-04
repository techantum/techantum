import Icon from '@/components/ui/AppIcon';

interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function IndustriesServedSection({
  title,
  description,
  industries,
}: {
  title: string;
  description: string;
  industries: Industry[];
}) {
  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="font-bricolage text-3xl font-bold text-foreground mb-3">{title}</h2>
          <p className="font-inter text-muted-foreground">{description}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal reveal-stagger">
          {industries.map((industry) => (
            <div key={industry.id} className="bg-card border border-border rounded-xl p-5 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Icon name={industry.icon as any} size={24} className="text-primary" />
              </div>
              <h3 className="font-bricolage font-semibold text-foreground mb-2">{industry.name}</h3>
              <p className="font-inter text-sm text-muted-foreground">{industry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
