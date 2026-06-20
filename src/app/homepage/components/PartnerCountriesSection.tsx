'use client';
export default function PartnerCountriesSection() {
  const technologies = [
    { id: 'tech_react', name: 'React', icon: '⚛️' },
    { id: 'tech_nextjs', name: 'Next.js', icon: '▲' },
    { id: 'tech_typescript', name: 'TypeScript', icon: 'TS' },
    { id: 'tech_node', name: 'Node.js', icon: '🟢' },
    { id: 'tech_reactnative', name: 'React Native', icon: '📱' },
    { id: 'tech_flutter', name: 'Flutter', icon: '🦋' },
    { id: 'tech_aws', name: 'AWS', icon: '☁️' },
    { id: 'tech_supabase', name: 'Supabase', icon: '⚡' },
  ]

  const duplicatedTechnologies = [...technologies, ...technologies]

  return (
    <section className="py-16 bg-muted/50 overflow-hidden reveal grid-bg">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="text-center">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Tech Stack
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Technologies We Use
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            We build with modern, battle-tested technologies to deliver fast, secure, and scalable solutions.
          </p>
        </div>
      </div>
      <div className="relative">
        <div className="flex gap-8 animate-marquee">
          {duplicatedTechnologies?.map((tech, index) => (
            <div
              key={`${tech?.id}_${index}`}
              className="flex items-center gap-4 bg-card px-8 py-4 rounded-full border border-border shadow-sm shrink-0"
            >
              <span className="text-2xl font-bold">{tech?.icon}</span>
              <span className="font-inter font-semibold text-base text-foreground whitespace-nowrap">
                {tech?.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
