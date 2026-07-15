import Icon from '@/components/ui/AppIcon';
import type { AboutValue } from '@/lib/about-data';

interface ValuesSectionProps {
  title: string;
  description: string;
  values: AboutValue[];
}

export default function ValuesSection({ title, description, values }: ValuesSectionProps) {
  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 reveal reveal-stagger">
          {values.map((value) => (
            <div
              key={value.id}
              className="bg-card p-4 rounded-2xl shadow-sm border border-border hover-lift"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon name={value.icon as any} size={24} className="text-primary" />
              </div>
              <h3 className="font-bricolage text-xl font-semibold text-foreground mb-3">
                {value.title}
              </h3>
              <p className="font-inter text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
