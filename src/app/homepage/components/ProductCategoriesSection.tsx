import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function ProductCategoriesSection() {
  const services = [
    {
      id: 'svc_websites',
      name: 'Websites',
      description: 'Corporate sites, landing pages, e-commerce, and CMS-powered websites',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      imageAlt: 'Modern responsive website displayed on laptop screen',
      href: '/services#websites',
      icon: 'ComputerDesktopIcon',
    },
    {
      id: 'svc_webapps',
      name: 'Web Applications',
      description: 'Custom web apps, SaaS platforms, dashboards, and API development',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
      imageAlt: 'Developer building a custom web application',
      href: '/services#web-applications',
      icon: 'CodeBracketIcon',
    },
    {
      id: 'svc_mobile',
      name: 'Mobile Applications',
      description: 'Native and cross-platform iOS & Android apps with full lifecycle support',
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
      imageAlt: 'Mobile applications running on smartphone devices',
      href: '/services#mobile-applications',
      icon: 'DevicePhoneMobileIcon',
    },
  ];

  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Our Services
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Digital Solutions for Every Need
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you need a website, a complex web application, or a mobile app — we have the expertise to bring your vision to life.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal reveal-stagger">
          {services.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              className="group bg-card rounded-2xl overflow-hidden shadow-sm hover-lift glow-card border border-border"
            >
              <div className="relative h-64 overflow-hidden">
                <AppImage
                  src={service.image}
                  alt={service.imageAlt}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={service.icon as any} size={20} className="text-white" />
                    <h3 className="font-bricolage text-2xl font-bold text-white">
                      {service.name}
                    </h3>
                  </div>
                  <p className="font-inter text-sm text-white/90">
                    {service.description}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="font-inter text-sm font-medium text-primary">
                    Learn More
                  </span>
                  <Icon
                    name="ArrowRightIcon"
                    size={20}
                    className="text-primary group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
