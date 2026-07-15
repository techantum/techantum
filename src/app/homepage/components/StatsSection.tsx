import Icon from '@/components/ui/AppIcon';
import { getDefaultContent } from '@/lib/cms/default-content';

export default function StatsSection({ content }: { content?: Record<string, unknown> }) {
  const data = { ...getDefaultContent('homepage.stats'), ...content };
  const stats = (data.stats as Array<{
    id: string;
    icon: string;
    value: string;
    label: string;
    description: string;
  }>) || [];

  return (
    <section className="page-section bg-muted reveal">
      <div className="page-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 reveal reveal-stagger">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-card p-4 rounded-2xl shadow-sm hover-lift glow-card border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon name={stat.icon as any} size={24} className="text-primary" />
              </div>
              <h3 className="font-bricolage text-4xl font-bold text-foreground mb-2">{stat.value}</h3>
              <p className="font-inter font-semibold text-base text-foreground mb-1">{stat.label}</p>
              <p className="font-inter text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
