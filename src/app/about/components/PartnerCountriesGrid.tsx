import type { AboutRegion } from '@/lib/about-data';

interface PartnerCountriesGridProps {
  title: string;
  description: string;
  regions: AboutRegion[];
}

export default function PartnerCountriesGrid({
  title,
  description,
  regions,
}: PartnerCountriesGridProps) {
  return (
    <section className="page-section bg-muted reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">{description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 reveal reveal-stagger">
          {regions.map((region) => (
            <div
              key={region.id}
              className="bg-card p-4 rounded-2xl shadow-sm border border-border hover-lift text-center"
            >
              <div className="text-5xl mb-3">{region.flag}</div>
              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-1">
                {region.name}
              </h3>
              <p className="font-inter text-sm text-primary font-medium">{region.projects} Projects</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
