interface UspItem {
  id: string;
  title: string;
  description: string;
}

interface UspContent {
  title: string;
  description: string;
  experienceYears: string;
  differentiators: UspItem[];
  achievements: string[];
}

export default function AboutUSPSection({ content }: { content: UspContent }) {
  return (
    <section className="page-section bg-muted/40 reveal">
      <div className="page-container">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="font-bricolage text-3xl font-bold text-foreground mb-3">{content.title}</h2>
          <p className="font-inter text-muted-foreground">{content.description}</p>
          {content.experienceYears && (
            <p className="font-bricolage text-4xl font-bold text-primary mt-4">{content.experienceYears} Years</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 reveal reveal-stagger">
          {content.differentiators?.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bricolage font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="font-inter text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
        {content.achievements?.length > 0 && (
          <ul className="max-w-2xl mx-auto space-y-2">
            {content.achievements.map((item) => (
              <li key={item} className="flex items-start gap-2 font-inter text-muted-foreground">
                <span className="text-primary mt-1">✓</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
