import Icon from '@/components/ui/AppIcon';

export default function ValuesSection() {
  const values = [
    {
      id: 'val_quality',
      icon: 'CheckBadgeIcon',
      title: 'Quality First',
      description: 'Every line of code is reviewed, tested, and built to last. We never cut corners on quality.',
    },
    {
      id: 'val_reliability',
      icon: 'ClockIcon',
      title: 'On-Time Delivery',
      description: 'We set realistic timelines and stick to them. Regular updates keep you informed at every stage.',
    },
    {
      id: 'val_transparency',
      icon: 'DocumentTextIcon',
      title: 'Transparency',
      description: 'Clear pricing, honest timelines, and open communication. No hidden costs or surprise scope changes.',
    },
    {
      id: 'val_security',
      icon: 'ShieldCheckIcon',
      title: 'Security',
      description: 'Security best practices built into every project — authentication, encryption, and secure deployments.',
    },
    {
      id: 'val_innovation',
      icon: 'LightBulbIcon',
      title: 'Innovation',
      description: 'We stay current with the latest technologies and recommend the best tools for your specific needs.',
    },
    {
      id: 'val_support',
      icon: 'ChatBubbleBottomCenterTextIcon',
      title: 'Ongoing Support',
      description: 'Post-launch maintenance, updates, and dedicated support to keep your product running smoothly.',
    },
  ]

  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Core Values
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">
            The principles that guide every project and client relationship at TechAntum.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal reveal-stagger">
          {values.map((value) => (
            <div
              key={value.id}
              className="bg-card p-6 rounded-2xl shadow-sm border border-border hover-lift"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon name={value.icon as any} size={24} className="text-primary" />
              </div>
              <h3 className="font-bricolage text-xl font-semibold text-foreground mb-3">
                {value.title}
              </h3>
              <p className="font-inter text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
