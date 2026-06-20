import Icon from '@/components/ui/AppIcon';

export default function StatsSection() {
  const stats = [
    {
      id: 'stat_projects',
      icon: 'RocketLaunchIcon',
      value: '150+',
      label: 'Projects Delivered',
      description: 'Websites, web apps, and mobile apps',
    },
    {
      id: 'stat_clients',
      icon: 'UsersIcon',
      value: '80+',
      label: 'Happy Clients',
      description: 'Businesses across industries worldwide',
    },
    {
      id: 'stat_services',
      icon: 'CubeIcon',
      value: '3',
      label: 'Core Services',
      description: 'Websites, web apps, and mobile apps',
    },
    {
      id: 'stat_years',
      icon: 'CheckBadgeIcon',
      value: '8+',
      label: 'Years Experience',
      description: 'Building digital products since 2018',
    },
  ]

  return (
    <section className="py-16 bg-muted reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 reveal reveal-stagger">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-card p-6 rounded-2xl shadow-sm hover-lift glow-card border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon name={stat.icon as any} size={24} className="text-primary" />
              </div>
              <h3 className="font-bricolage text-4xl font-bold text-foreground mb-2">
                {stat.value}
              </h3>
              <p className="font-inter font-semibold text-base text-foreground mb-1">
                {stat.label}
              </p>
              <p className="font-inter text-sm text-muted-foreground">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
