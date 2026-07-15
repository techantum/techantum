import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function WebsitesSection() {
  const offerings = [
    {
      id: 'web_corporate',
      name: 'Corporate Websites',
      description: 'Professional, brand-aligned websites that establish credibility and convert visitors into customers.',
      features: ['Responsive Design', 'Brand Identity', 'Multi-language', 'Analytics Setup'],
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      imageAlt: 'Modern corporate website displayed on laptop and mobile devices',
    },
    {
      id: 'web_landing',
      name: 'Landing Pages',
      description: 'High-converting landing pages optimized for campaigns, lead generation, and product launches.',
      features: ['A/B Testing Ready', 'Fast Load Times', 'Lead Capture Forms', 'SEO Optimized'],
      image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3',
      imageAlt: 'Clean landing page design with call-to-action elements',
    },
    {
      id: 'web_ecommerce',
      name: 'E-commerce Stores',
      description: 'Full-featured online stores with secure payments, inventory management, and order tracking.',
      features: ['Payment Integration', 'Product Catalog', 'Cart & Checkout', 'Order Management'],
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d',
      imageAlt: 'E-commerce website with product listings and shopping cart',
    },
    {
      id: 'web_portfolio',
      name: 'Portfolio & Brochure Sites',
      description: 'Showcase your work, services, or brand story with elegant, content-focused designs.',
      features: ['Gallery Layouts', 'CMS Integration', 'Contact Forms', 'Social Links'],
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
      imageAlt: 'Developer workspace with code editor showing website project',
    },
    {
      id: 'web_cms',
      name: 'CMS-Powered Sites',
      description: 'Content-managed websites that let your team update pages, blogs, and media without code.',
      features: ['Easy Content Editing', 'Role-based Access', 'Media Library', 'Scheduled Publishing'],
      image: 'https://images.unsplash.com/photo-1547658719-da2b51169166',
      imageAlt: 'Content management dashboard for website editing',
    },
    {
      id: 'web_seo',
      name: 'SEO & Performance',
      description: 'Technical SEO, Core Web Vitals optimization, and structured data to rank higher and load faster.',
      features: ['Technical SEO', 'Core Web Vitals', 'Schema Markup', 'Performance Audits'],
      image: 'https://images.unsplash.com/photo-1432888622747-4eb9ef8eb70a',
      imageAlt: 'Analytics dashboard showing website traffic and performance metrics',
    },
  ];

  return (
    <section id="websites" className="page-section reveal">
      <div className="page-container">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="ComputerDesktopIcon" size={24} className="text-primary" />
            </div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground">
              Websites
            </h2>
          </div>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl">
            Beautiful, fast, and search-engine-friendly websites built with modern frameworks like Next.js and React.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 reveal reveal-stagger">
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
                      className="font-inter text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
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
            className="inline-flex items-center gap-2 font-inter text-base font-medium text-primary hover:underline"
          >
            Get a website quote
            <Icon name="ArrowRightIcon" size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
