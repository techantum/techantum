import Icon from '@/components/ui/AppIcon';
import { industries } from '@/lib/portfolio-data';

export default function IndustriesSection() {
  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Industries We Serve
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Cross-Industry Expertise
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            Deep experience delivering digital platforms tailored to the needs of diverse business sectors.
          </p>
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
