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
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-3">
            {title}
          </h2>
          <p className="font-inter text-base text-muted-foreground">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto reveal reveal-stagger">
          {regions.map((region) => (
            <div
              key={region.id}
              className="bg-card p-6 rounded-lg border border-border text-center"
            >
              <h3 className="font-bricolage text-xl font-semibold text-foreground mb-2">
                {region.name}
              </h3>
              <p className="font-inter text-sm text-muted-foreground mb-3">Primary market</p>
              <p className="font-inter text-2xl font-semibold text-primary">{region.projects}</p>
              <p className="font-inter text-xs text-muted-foreground mt-1">Projects delivered</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
