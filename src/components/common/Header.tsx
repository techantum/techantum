'use client';
import { useState, useEffect } from 'react';
 import Link from 'next/link';
import { usePathname } from 'next/navigation';
 import Icon from '@/components/ui/AppIcon';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { id: 'nav_home', label: 'Home', href: '/' },
    { id: 'nav_about', label: 'About Us', href: '/about' },
    { id: 'nav_services', label: 'Services', href: '/services' },
    { id: 'nav_portfolio', label: 'Portfolio', href: '/portfolio' },
    { id: 'nav_testimonials', label: 'Testimonials', href: '/testimonials' },
    { id: 'nav_blog', label: 'Blog', href: '/blog' },
    { id: 'nav_contact', label: 'Contact', href: '/contact' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background/90 backdrop-blur-xl shadow-md border-b border-border/50' : 'bg-background/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg">
              <span className="font-bricolage font-bold text-lg text-primary-foreground">T</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bricolage font-bold text-base text-foreground leading-tight">
                TechAntum
              </span>
              <span className="font-inter text-xs text-muted-foreground leading-tight">
                Digital Solutions
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks?.map((link) => (
              <Link
                key={link?.id}
                href={link?.href}
                className={`font-inter text-sm font-medium transition-colors ${
                  pathname === link?.href
                    ? 'text-primary' :'text-foreground hover:text-primary'
                }`}
              >
                {link?.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-6">
            <div className="flex flex-col text-right">
              <div className="flex items-center gap-3">
                <a
                  href="tel:+914040268570"
                  className="font-inter text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Icon name="PhoneIcon" size={16} />
                  +91 40 40268570
                </a>
                <a
                  href="https://wa.me/917032923474"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                  title="WhatsApp +91 70329 23474"
                >
                  <Icon name="ChatBubbleLeftRightIcon" size={16} />
                </a>
              </div>
              <a
                href="mailto:info@techantum.com"
                className="font-inter text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                info@techantum.com
              </a>
            </div>
            <Link
              href="/contact"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-primary/90 transition-colors btn-shine"
            >
              Get a Quote
            </Link>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            <Icon name={isMenuOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-border">
            <nav className="flex flex-col gap-4">
              {navLinks?.map((link) => (
                <Link
                  key={link?.id}
                  href={link?.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-inter text-base font-medium py-2 transition-colors ${
                    pathname === link?.href
                      ? 'text-primary' :'text-foreground hover:text-primary'
                  }`}
                >
                  {link?.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-3">
                  <a
                    href="tel:+914040268570"
                    className="font-inter text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <Icon name="PhoneIcon" size={16} />
                    +91 40 40268570
                  </a>
                  <a
                    href="https://wa.me/917032923474"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors"
                    title="WhatsApp +91 70329 23474"
                  >
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                  </a>
                </div>
                <a
                  href="mailto:info@techantum.com"
                  className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors block"
                >
                  info@techantum.com
                </a>
                <Link
                  href="/contact"
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-primary/90 transition-colors inline-block mt-2"
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
