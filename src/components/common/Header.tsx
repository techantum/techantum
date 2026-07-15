'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { defaultBranding } from '@/lib/cms/default-content';
import type { SiteBranding } from '@/lib/cms/types';
import { getDivisionPath, serviceDivisions } from '@/lib/service-packages-data';

export default function Header({ branding = defaultBranding }: { branding?: SiteBranding }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'nav_home', label: 'Home', href: '/' },
    { id: 'nav_about', label: 'About Us', href: '/about' },
    { id: 'nav_portfolio', label: 'Portfolio', href: '/portfolio' },
    { id: 'nav_testimonials', label: 'Testimonials', href: '/testimonials' },
    { id: 'nav_blog', label: 'Blog', href: '/blog' },
    { id: 'nav_contact', label: 'Contact', href: '/contact' },
  ];

  const isServicesActive =
    pathname === '/services' || (pathname?.startsWith('/services/') ?? false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'navbar-glass-scrolled' : 'navbar-glass'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-5">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center shrink-0" aria-label={branding.company_name}>
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={branding.company_name}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg shrink-0">
                <span className="font-bricolage font-bold text-lg text-primary-foreground">
                  {branding.logo_letter}
                </span>
              </div>
            )}
          </Link>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-5">
            <Link
              href="/"
              className={`font-inter text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'text-secondary'
                  : 'text-foreground hover:text-secondary'
              }`}
            >
              Home
            </Link>
            <Link
              href="/about"
              className={`font-inter text-sm font-medium transition-colors ${
                pathname === '/about'
                  ? 'text-secondary'
                  : 'text-foreground hover:text-secondary'
              }`}
            >
              About Us
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <Link
                href="/services"
                className={`font-inter text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                  isServicesActive
                    ? 'text-secondary'
                    : 'text-foreground hover:text-secondary'
                }`}
              >
                Services
                <Icon name="ChevronDownIcon" size={14} />
              </Link>
              {servicesOpen && (
                <div className="absolute top-full left-0 pt-2 w-72">
                  <div className="bg-card border border-border rounded-xl shadow-lg py-2">
                    <Link
                      href="/services"
                      className="block px-4 py-2 font-inter text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      All Services
                    </Link>
                    {serviceDivisions.map((division) => (
                      <Link
                        key={division.slug}
                        href={getDivisionPath(division.slug)}
                        className="block px-4 py-2 font-inter text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {division.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {navLinks.slice(2).map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={`font-inter text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-secondary'
                    : 'text-foreground hover:text-secondary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col text-right">
              <div className="flex items-center gap-3">
                <a
                  href={`tel:${branding.phone_href}`}
                  className="font-inter text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Icon name="PhoneIcon" size={16} />
                  {branding.phone}
                </a>
                <a
                  href={`https://wa.me/${branding.whatsapp_href}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                  title={`WhatsApp ${branding.whatsapp}`}
                >
                  <Icon name="ChatBubbleLeftRightIcon" size={16} />
                </a>
              </div>
              <a
                href={`mailto:${branding.email}`}
                className="font-inter text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {branding.email}
              </a>
            </div>
            <Link
              href="/contact"
              className="bg-secondary text-secondary-foreground px-6 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-secondary/90 transition-colors btn-shine"
            >
              Get a Quote
            </Link>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 -mr-2 text-foreground"
            aria-label="Toggle menu"
          >
            <Icon name={isMenuOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} />
          </button>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden py-3 sm:py-4 border-t border-white/40 bg-white/90 backdrop-blur-xl max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="flex flex-col gap-1 sm:gap-2">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className={`font-inter text-base font-medium py-2 transition-colors ${
                  pathname === '/'
                    ? 'text-secondary'
                    : 'text-foreground hover:text-secondary'
                }`}
              >
                Home
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMenuOpen(false)}
                className={`font-inter text-base font-medium py-2 transition-colors ${
                  pathname === '/about'
                    ? 'text-secondary'
                    : 'text-foreground hover:text-secondary'
                }`}
              >
                About Us
              </Link>
              <Link
                href="/services"
                onClick={() => setIsMenuOpen(false)}
                className={`font-inter text-base font-medium py-2 transition-colors ${
                  isServicesActive
                    ? 'text-secondary'
                    : 'text-foreground hover:text-secondary'
                }`}
              >
                Services
              </Link>
              {serviceDivisions.map((division) => (
                <Link
                  key={division.slug}
                  href={getDivisionPath(division.slug)}
                  onClick={() => setIsMenuOpen(false)}
                  className="font-inter text-sm text-muted-foreground py-1.5 pl-4 transition-colors hover:text-secondary"
                >
                  {division.name}
                </Link>
              ))}
              {navLinks.slice(2).map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-inter text-base font-medium py-2 transition-colors ${
                    pathname === link.href
                      ? 'text-secondary'
                      : 'text-foreground hover:text-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-3">
                  <a
                    href={`tel:${branding.phone_href}`}
                    className="font-inter text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <Icon name="PhoneIcon" size={16} />
                    {branding.phone}
                  </a>
                  <a
                    href={`https://wa.me/${branding.whatsapp_href}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors"
                    title={`WhatsApp ${branding.whatsapp}`}
                  >
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                  </a>
                </div>
                <a
                  href={`mailto:${branding.email}`}
                  className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors block"
                >
                  {branding.email}
                </a>
                <Link
                  href="/contact"
                  className="bg-secondary text-secondary-foreground px-6 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-secondary/90 transition-colors inline-block mt-2"
                >
                  Get a Quote
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
