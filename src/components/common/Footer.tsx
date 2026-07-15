import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { defaultBranding } from '@/lib/cms/default-content';
import type { SiteBranding } from '@/lib/cms/types';
import { getDivisionPath, serviceDivisions } from '@/lib/service-packages-data';

export default function Footer({ branding = defaultBranding }: { branding?: SiteBranding }) {
  const footerLogo = branding.footer_logo_url || branding.logo_url;
  const serviceLinks = serviceDivisions.map((division) => ({
    id: division.slug,
    label: division.shortName,
    href: getDivisionPath(division.slug),
  }));

  const companyLinks = [
    { id: 'comp_about', label: 'About Us', href: '/about' },
    { id: 'comp_portfolio', label: 'Portfolio', href: '/portfolio' },
    { id: 'comp_test', label: 'Testimonials', href: '/testimonials' },
    { id: 'comp_blog', label: 'Blog', href: '/blog' },
    { id: 'comp_contact', label: 'Contact', href: '/contact' },
  ]

  const legalLinks = [
    { id: 'legal_privacy', label: 'Privacy Policy', href: '/privacy-policy' },
    { id: 'legal_terms', label: 'Terms of Service', href: '/terms-of-service' },
  ]

  return (
    <footer className="bg-card border-t border-border">
      <div className="page-container py-5 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
          <div className="md:col-span-4">
            {footerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={footerLogo}
                alt={branding.company_name}
                className="h-12 w-auto object-contain mb-4"
              />
            ) : (
              <h3 className="font-bricolage font-bold text-xl text-foreground mb-4">
                {branding.company_name}
              </h3>
            )}
            <p className="font-inter text-sm text-muted-foreground mb-4">
              {branding.footer_description}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Icon name="MapPinIcon" size={16} className="mt-0.5 shrink-0" />
                <span>{branding.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Icon name="PhoneIcon" size={16} className="shrink-0" />
                <a href={`tel:${branding.phone_href}`} className="hover:text-primary transition-colors">
                  {branding.phone}
                </a>
                <a
                  href={`https://wa.me/${branding.whatsapp_href}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors ml-1"
                  title={`WhatsApp ${branding.whatsapp}`}
                >
                  <Icon name="ChatBubbleLeftRightIcon" size={16} className="shrink-0" />
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Icon name="EnvelopeIcon" size={16} className="shrink-0" />
                <a href={`mailto:${branding.email}`} className="hover:text-primary transition-colors">
                  {branding.email}
                </a>
              </p>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-bricolage font-semibold text-base text-foreground mb-4">
              Services
            </h4>
            <ul className="space-y-2">
              {serviceLinks?.map((link) => (
                <li key={link?.id}>
                  <Link
                    href={link?.href}
                    className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-bricolage font-semibold text-base text-foreground mb-4">
              Company
            </h4>
            <ul className="space-y-2">
              {companyLinks?.map((link) => (
                <li key={link?.id}>
                  <Link
                    href={link?.href}
                    className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-bricolage font-semibold text-base text-foreground mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              {legalLinks?.map((link) => (
                <li key={link?.id}>
                  <Link
                    href={link?.href}
                    className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-inter text-sm text-muted-foreground">
            {branding.copyright_text}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href="/terms-of-service"
              className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
