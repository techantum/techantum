export default function TimelineSection() {
  const milestones = [
    {
      id: 'mile_1',
      year: '2018',
      title: 'TechAntum Founded',
      description: 'Started as a web development studio in Hyderabad, India',
    },
    {
      id: 'mile_2',
      year: '2019',
      title: 'First Major Clients',
      description: 'Delivered corporate websites and web apps for clients across Europe',
    },
    {
      id: 'mile_3',
      year: '2020',
      title: 'Mobile Development',
      description: 'Expanded services to include iOS and Android app development',
    },
    {
      id: 'mile_4',
      year: '2021',
      title: 'SaaS Expertise',
      description: 'Built multiple SaaS platforms and admin dashboards for startups',
    },
    {
      id: 'mile_5',
      year: '2022',
      title: '50+ Projects',
      description: 'Reached milestone of 50 successfully delivered digital products',
    },
    {
      id: 'mile_6',
      year: '2023',
      title: 'Cloud & DevOps',
      description: 'Added cloud deployment, CI/CD, and infrastructure services',
    },
    {
      id: 'mile_7',
      year: '2024',
      title: '150+ Projects',
      description: 'Delivered over 150 websites, web apps, and mobile applications',
    },
    {
      id: 'mile_8',
      year: '2026',
      title: 'Continued Innovation',
      description: 'Expanding AI integration, cross-platform development, and enterprise solutions',
    },
  ]

  return (
    <section className="py-16 bg-muted reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Journey
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">
            From a small web studio to a full-service IT company — here&apos;s how we&apos;ve grown.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border hidden md:block" />

          <div className="space-y-8 reveal reveal-stagger">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`flex flex-col md:flex-row items-center gap-4 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border border-border inline-block">
                    <span className="font-bricolage text-2xl font-bold text-primary">{milestone.year}</span>
                    <h3 className="font-bricolage text-xl font-semibold text-foreground mt-2 mb-1">
                      {milestone.title}
                    </h3>
                    <p className="font-inter text-sm text-muted-foreground">{milestone.description}</p>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full bg-primary border-4 border-background shrink-0 hidden md:block" />
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
