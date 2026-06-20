import Icon from '@/components/ui/AppIcon';

export default function StatsSection() {
  const stats = [
    {
      id: 'stat_partners',
      icon: 'UsersIcon',
      value: '1000+',
      label: 'Global Partners',
      description: 'Trusted by businesses worldwide',
    },
    {
      id: 'stat_countries',
      icon: 'GlobeAltIcon',
      value: '6+',
      label: 'Countries',
      description: 'International distribution network',
    },
    {
      id: 'stat_products',
      icon: 'CubeIcon',
      value: '5',
      label: 'Product Categories',
      description: 'Diverse wholesale solutions',
    },
    {
      id: 'stat_years',
      icon: 'CheckBadgeIcon',
      value: '8+',
      label: 'Years Experience',
      description: 'Established since 2018',
    },
  ]

  return (
    <section className="py-16 bg-muted reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-card p-6 rounded-2xl shadow-sm hover-lift border border-border"
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