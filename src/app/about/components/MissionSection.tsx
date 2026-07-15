import Icon from '@/components/ui/AppIcon';
import type { AboutMissionCard } from '@/lib/about-data';

interface MissionSectionProps {
  title: string;
  description: string;
  cards: AboutMissionCard[];
}

export default function MissionSection({ title, description, cards }: MissionSectionProps) {
  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="font-inter text-xl text-muted-foreground max-w-3xl mx-auto">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 reveal reveal-stagger">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-card p-5 rounded-2xl shadow-sm border border-border hover-lift text-center"
            >
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 ${card.bgClass}`}
              >
                <Icon name={card.icon as any} size={32} className={card.iconClass} />
              </div>
              <h3 className="font-bricolage text-xl font-semibold text-foreground mb-3">
                {card.title}
              </h3>
              <p className="font-inter text-sm text-muted-foreground">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
