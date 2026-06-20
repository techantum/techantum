import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import ServicesHero from './components/ServicesHero';
import WebsitesSection from './components/WebsitesSection';
import WebApplicationsSection from './components/WebApplicationsSection';
import MobileApplicationsSection from './components/MobileApplicationsSection';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export default function ServicesPage() {
  const serviceCategories = [
    {
      id: 'cat_websites',
      name: 'Websites',
      description: '6 offerings',
      href: '/services#websites',
      icon: 'ComputerDesktopIcon',
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10 group-hover:bg-primary/20',
    },
    {
      id: 'cat_webapps',
      name: 'Web Applications',
      description: '6 offerings',
      href: '/services#web-applications',
      icon: 'CodeBracketIcon',
      iconClass: 'text-secondary',
      bgClass: 'bg-secondary/10 group-hover:bg-secondary/20',
    },
    {
      id: 'cat_mobile',
      name: 'Mobile Applications',
      description: '6 offerings',
      href: '/services#mobile-applications',
      icon: 'DevicePhoneMobileIcon',
      iconClass: 'text-accent',
      bgClass: 'bg-accent/10 group-hover:bg-accent/20',
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        <ServicesHero />

        <section className="py-12 bg-muted/50 reveal">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-bricolage text-3xl font-bold text-foreground mb-8 text-center reveal-fade">
              Explore Our Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal reveal-stagger">
              {serviceCategories.map((category) => (
                <Link
                  key={category.id}
                  href={category.href}
                  className="group bg-card border border-border rounded-xl p-8 hover:shadow-lg hover:border-primary transition-all duration-300 hover-lift"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${category.bgClass}`}
                    >
                      <Icon
                        name={category.icon as any}
                        size={28}
                        className={category.iconClass}
                      />
                    </div>
                    <h3 className="font-bricolage text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="font-inter text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <WebsitesSection />
        <WebApplicationsSection />
        <MobileApplicationsSection />
      </main>
      <Footer />
    </>
  );
}
