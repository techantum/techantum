import Icon from '@/components/ui/AppIcon';

export default function CertificationsSection() {
  const certifications = [
    {
      id: 'cert_iso',
      title: 'ISO 27001',
      description: 'Information Security Management',
      icon: 'ShieldCheckIcon',
    },
    {
      id: 'cert_gdpr',
      title: 'GDPR Compliant',
      description: 'Data Protection Standards',
      icon: 'LockClosedIcon',
    },
    {
      id: 'cert_agile',
      title: 'Agile Certified',
      description: 'Scrum & Kanban Methodology',
      icon: 'ArrowPathIcon',
    },
    {
      id: 'cert_cloud',
      title: 'Cloud Partners',
      description: 'AWS, Google Cloud, Azure',
      icon: 'CloudIcon',
    },
  ]

  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Standards & Practices
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">
            We follow industry best practices for security, quality, and project delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 reveal reveal-stagger">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="bg-card p-6 rounded-2xl shadow-sm border border-border hover-lift text-center"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon name={cert.icon as any} size={32} className="text-primary" />
              </div>
              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-2">
                {cert.title}
              </h3>
              <p className="font-inter text-sm text-muted-foreground">
                {cert.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-card p-8 rounded-2xl shadow-sm border border-border text-center">
          <h3 className="font-bricolage text-2xl font-semibold text-foreground mb-4">
            TechAntum at a Glance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="font-inter text-sm text-muted-foreground mb-1">Projects Delivered</p>
              <p className="font-inter text-lg font-semibold text-foreground">150+</p>
            </div>
            <div>
              <p className="font-inter text-sm text-muted-foreground mb-1">Happy Clients</p>
              <p className="font-inter text-lg font-semibold text-foreground">80+</p>
            </div>
            <div>
              <p className="font-inter text-sm text-muted-foreground mb-1">Established</p>
              <p className="font-inter text-lg font-semibold text-foreground">2018</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
