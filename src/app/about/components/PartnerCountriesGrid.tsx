export default function PartnerCountriesGrid() {
  const regions = [
    { id: 'reg_europe', name: 'Europe', flag: '🇪🇺', projects: '60+' },
    { id: 'reg_americas', name: 'Americas', flag: '🌎', projects: '35+' },
    { id: 'reg_africa', name: 'Africa', flag: '🌍', projects: '20+' },
    { id: 'reg_asia', name: 'Asia', flag: '🌏', projects: '25+' },
    { id: 'reg_nl', name: 'Netherlands', flag: '🇳🇱', projects: '30+' },
    { id: 'reg_de', name: 'Germany', flag: '🇩🇪', projects: '25+' },
    { id: 'reg_uk', name: 'United Kingdom', flag: '🇬🇧', projects: '15+' },
    { id: 'reg_us', name: 'United States', flag: '🇺🇸', projects: '20+' },
  ]

  return (
    <section className="py-16 bg-muted reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Global Client Base
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">
            We&apos;ve delivered digital products for clients across continents and industries.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 reveal reveal-stagger">
          {regions?.map((region) => (
            <div
              key={region?.id}
              className="bg-card p-6 rounded-2xl shadow-sm border border-border hover-lift text-center"
            >
              <div className="text-5xl mb-3">{region?.flag}</div>
              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-1">
                {region?.name}
              </h3>
              <p className="font-inter text-sm text-primary font-medium">
                {region?.projects} Projects
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
