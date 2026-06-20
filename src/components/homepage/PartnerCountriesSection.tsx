'use client';
export default function PartnerCountriesSection() {
  const countries = [
    { id: 'country_belgium', name: 'Belgium', flag: '🇧🇪' },
    { id: 'country_brazil', name: 'Brazil', flag: '🇧🇷' },
    { id: 'country_morocco', name: 'Morocco', flag: '🇲🇦' },
    { id: 'country_russia', name: 'Russia', flag: '🇷🇺' },
    { id: 'country_canada', name: 'Canada', flag: '🇨🇦' },
    { id: 'country_netherlands', name: 'Netherlands', flag: '🇳🇱' },
    { id: 'country_germany', name: 'Germany', flag: '🇩🇪' },
    { id: 'country_france', name: 'France', flag: '🇫🇷' },
  ]

  // Duplicate for seamless loop
  const duplicatedCountries = [...countries, ...countries]

  return (
    <section className="py-16 bg-muted overflow-hidden reveal">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="text-center">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Global Reach
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Partner Countries
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            Serving businesses across multiple continents with reliable wholesale supply solutions.
          </p>
        </div>
      </div>
      {/* Marquee */}
      <div className="relative">
        <div className="flex gap-8 animate-marquee">
          {duplicatedCountries?.map((country, index) => (
            <div
              key={`${country?.id}_${index}`}
              className="flex items-center gap-4 bg-card px-8 py-4 rounded-full border border-border shadow-sm shrink-0"
            >
              <span className="text-4xl">{country?.flag}</span>
              <span className="font-inter font-semibold text-base text-foreground whitespace-nowrap">
                {country?.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}