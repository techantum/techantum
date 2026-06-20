import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function BlogGrid() {
  const articles = [
  {
    id: 'blog_1',
    title: 'Why Next.js Is the Best Choice for Business Websites in 2026',
    excerpt: 'Explore how Next.js delivers faster load times, better SEO, and a superior developer experience for modern business websites.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
    imageAlt: 'Next.js logo displayed on a developer laptop screen',
    category: 'Websites',
    readTime: '8 min read',
    date: '2026-02-10'
  },
  {
    id: 'blog_2',
    title: 'Building Scalable SaaS Applications: A Complete Guide',
    excerpt: 'Everything you need to know about multi-tenancy, subscription billing, user management, and cloud architecture for SaaS products.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
    imageAlt: 'SaaS dashboard with analytics charts and user metrics',
    category: 'Web Applications',
    readTime: '10 min read',
    date: '2026-02-05'
  },
  {
    id: 'blog_3',
    title: 'React Native vs Flutter: Which Should You Choose?',
    excerpt: 'A practical comparison of the two leading cross-platform mobile frameworks — performance, ecosystem, and real-world trade-offs.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
    imageAlt: 'Mobile phones showing cross-platform app development',
    category: 'Mobile Applications',
    readTime: '7 min read',
    date: '2026-01-28'
  },
  {
    id: 'blog_4',
    title: 'Web Application Security Best Practices for 2026',
    excerpt: 'Essential security measures every web app should implement — authentication, authorization, input validation, and HTTPS.',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3',
    imageAlt: 'Cybersecurity concept with lock icon on digital interface',
    category: 'Web Applications',
    readTime: '9 min read',
    date: '2026-01-20'
  },
  {
    id: 'blog_5',
    title: 'How to Plan Your Mobile App MVP',
    excerpt: 'Step-by-step guide to defining features, choosing the right tech stack, and launching a minimum viable product quickly.',
    image: 'https://images.unsplash.com/photo-1555774698-0c77d0d5c11d',
    imageAlt: 'Mobile app wireframes and planning documents on desk',
    category: 'Mobile Applications',
    readTime: '6 min read',
    date: '2026-01-15'
  },
  {
    id: 'blog_6',
    title: 'The Complete Guide to Website Performance Optimization',
    excerpt: 'Core Web Vitals, image optimization, code splitting, and caching strategies to make your website blazing fast.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    imageAlt: 'Website performance metrics displayed on analytics dashboard',
    category: 'Websites',
    readTime: '11 min read',
    date: '2026-01-08'
  },
  {
    id: 'blog_7',
    title: 'Choosing the Right Tech Stack for Your Startup',
    excerpt: 'How to evaluate frameworks, databases, and cloud providers based on your team, budget, and product requirements.',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97',
    imageAlt: 'Developer choosing technology stack on whiteboard',
    category: 'Industry Insights',
    readTime: '8 min read',
    date: '2025-12-28'
  },
  {
    id: 'blog_8',
    title: 'Agile Development: What Clients Should Expect',
    excerpt: 'Understanding sprints, demos, retrospectives, and how agile methodology keeps your project on track and transparent.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
    imageAlt: 'Agile development team in sprint planning meeting',
    category: 'Industry Insights',
    readTime: '10 min read',
    date: '2025-12-20'
  },
  {
    id: 'blog_9',
    title: 'E-commerce Website Essentials for 2026',
    excerpt: 'Payment gateways, inventory management, mobile checkout, and conversion optimization for online stores.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d',
    imageAlt: 'E-commerce website with product catalog and shopping cart',
    category: 'Websites',
    readTime: '7 min read',
    date: '2025-12-15'
  },
  {
    id: 'blog_10',
    title: 'API-First Development: Building for the Future',
    excerpt: 'Why designing APIs first leads to better web apps, mobile apps, and third-party integrations.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
    imageAlt: 'API documentation and code on developer screen',
    category: 'Web Applications',
    readTime: '9 min read',
    date: '2025-12-10'
  }];

  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 reveal reveal-stagger">
          {articles?.map((article) =>
          <article
            key={article?.id}
            className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover-lift group cursor-pointer">
            
              <div className="relative h-64 overflow-hidden">
                <AppImage
                src={article?.image}
                alt={article?.imageAlt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              
                <div className="absolute top-4 left-4">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-inter text-xs font-medium">
                    {article?.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Icon name="CalendarIcon" size={14} />
                    {new Date(article.date)?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="ClockIcon" size={14} />
                    {article?.readTime}
                  </span>
                </div>

                <h2 className="font-bricolage text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {article?.title}
                </h2>

                <p className="font-inter text-sm text-muted-foreground mb-4 leading-relaxed">
                  {article?.excerpt}
                </p>

                <div className="flex items-center gap-2 text-primary font-inter text-sm font-medium">
                  Read Article
                  <Icon name="ArrowRightIcon" size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>);
}
