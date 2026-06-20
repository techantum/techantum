import Icon from '@/components/ui/AppIcon';

export default function MissionSection() {
  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Mission
          </h2>
          <p className="font-inter text-xl text-muted-foreground max-w-3xl mx-auto">
            To empower businesses with high-quality digital products that drive growth, improve efficiency, and create exceptional user experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 reveal reveal-stagger">
          <div className="bg-card p-8 rounded-2xl shadow-sm border border-border hover-lift text-center">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="CodeBracketIcon" size={32} className="text-primary" />
            </div>
            <h3 className="font-bricolage text-xl font-semibold text-foreground mb-3">
              Quality Code
            </h3>
            <p className="font-inter text-sm text-muted-foreground">
              Clean, maintainable, and well-tested code built with modern best practices and industry standards.
            </p>
          </div>

          <div className="bg-card p-8 rounded-2xl shadow-sm border border-border hover-lift text-center">
            <div className="w-16 h-16 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="RocketLaunchIcon" size={32} className="text-secondary" />
            </div>
            <h3 className="font-bricolage text-xl font-semibold text-foreground mb-3">
              Fast Delivery
            </h3>
            <p className="font-inter text-sm text-muted-foreground">
              Agile development with regular demos and milestones so you see progress every step of the way.
            </p>
          </div>

          <div className="bg-card p-8 rounded-2xl shadow-sm border border-border hover-lift text-center">
            <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="UserGroupIcon" size={32} className="text-accent" />
            </div>
            <h3 className="font-bricolage text-xl font-semibold text-foreground mb-3">
              Partnership Focus
            </h3>
            <p className="font-inter text-sm text-muted-foreground">
              We work as an extension of your team with transparent communication and long-term support.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
