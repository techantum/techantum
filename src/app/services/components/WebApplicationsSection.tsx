import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function WebApplicationsSection() {
  const offerings = [
    {
      id: 'app_custom',
      name: 'Custom Web Applications',
      description: 'Tailor-made web apps designed around your unique workflows, users, and business logic.',
      features: ['Custom Workflows', 'User Roles', 'Real-time Data', 'Scalable Architecture'],
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
      imageAlt: 'Developer coding a custom web application on multiple monitors',
    },
    {
      id: 'app_saas',
      name: 'SaaS Platforms',
      description: 'Multi-tenant software-as-a-service products with subscriptions, billing, and user management.',
      features: ['Multi-tenancy', 'Subscription Billing', 'User Onboarding', 'Usage Analytics'],
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
      imageAlt: 'SaaS dashboard with charts and user management interface',
    },
    {
      id: 'app_dashboard',
      name: 'Admin Dashboards',
      description: 'Data-rich admin panels and internal tools for managing operations, users, and content.',
      features: ['Data Visualization', 'CRUD Operations', 'Export & Reports', 'Access Control'],
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692',
      imageAlt: 'Team collaborating around admin dashboard on large screen',
    },
    {
      id: 'app_api',
      name: 'API Development',
      description: 'Robust REST and GraphQL APIs that power your applications and integrate with third-party services.',
      features: ['REST & GraphQL', 'Authentication', 'Documentation', 'Rate Limiting'],
      image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea',
      imageAlt: 'API architecture diagram on developer screen',
    },
    {
      id: 'app_cloud',
      name: 'Cloud Integration',
      description: 'Deploy and scale on AWS, Google Cloud, or Azure with CI/CD pipelines and infrastructure as code.',
      features: ['Cloud Deployment', 'CI/CD Pipelines', 'Auto-scaling', 'Monitoring & Alerts'],
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
      imageAlt: 'Cloud infrastructure visualization with connected nodes',
    },
    {
      id: 'app_legacy',
      name: 'Legacy Modernization',
      description: 'Migrate outdated systems to modern stacks without disrupting your business operations.',
      features: ['System Audit', 'Gradual Migration', 'Data Preservation', 'Zero Downtime'],
      image: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd',
      imageAlt: 'Software modernization process with old and new system comparison',
    },
  ];

  return (
    <section id="web-applications" className="py-16 bg-muted/50 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Icon name="CodeBracketIcon" size={24} className="text-secondary" />
            </div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground">
              Web Applications
            </h2>
          </div>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl">
            Powerful, scalable web applications built with TypeScript, Node.js, and modern cloud-native practices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal reveal-stagger">
          {offerings.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover-lift group"
            >
              <div className="relative h-48 overflow-hidden">
                <AppImage
                  src={item.image}
                  alt={item.imageAlt}
                  width={600}
                  height={300}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bricolage text-xl font-semibold text-foreground mb-2">
                  {item.name}
                </h3>
                <p className="font-inter text-sm text-muted-foreground mb-4">{item.description}</p>
                <div className="flex flex-wrap gap-2">
                  {item.features.map((feature) => (
                    <span
                      key={feature}
                      className="font-inter text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 font-inter text-base font-medium text-secondary hover:underline"
          >
            Discuss your web app project
            <Icon name="ArrowRightIcon" size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
