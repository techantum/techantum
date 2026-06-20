import Link from 'next/link';
 import Icon from'@/components/ui/AppIcon';

export default function CTASection() {
  return (
    <section className="py-16 bg-brand-gradient reveal relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Ready to Build Something Great?
            </h2>
            <p className="font-inter text-lg text-primary-foreground/90 mb-6">
              Tell us about your project and get a free consultation. Our team will respond within 24 hours with a tailored plan and estimate.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">Free project consultation</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">Detailed proposal within 48 hours</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">Agile development with regular updates</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">Post-launch support and maintenance</span>
              </li>
            </ul>
          </div>

          <div className="lg:text-right space-y-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-card text-foreground px-8 py-4 rounded-full font-inter font-semibold text-lg hover:bg-card/90 transition-all hover-lift btn-shine shadow-lg"
            >
              Start Your Project
              <Icon name="ArrowRightIcon" size={24} />
            </Link>
            <p className="font-inter text-sm text-primary-foreground/80">
              Or call us directly at{' '}
              <a href="tel:+914040268570" className="font-semibold underline hover:no-underline">
                +91 40 40268570
              </a>
            </p>
            <div className="flex flex-wrap gap-4 justify-start lg:justify-end pt-4">
              <Link
                href="/services"
                className="font-inter text-base font-medium text-primary-foreground hover:underline flex items-center gap-2"
              >
                Explore Our Services
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
              <Link
                href="/portfolio"
                className="font-inter text-base font-medium text-primary-foreground hover:underline flex items-center gap-2"
              >
                View Our Portfolio
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
              <Link
                href="/about"
                className="font-inter text-base font-medium text-primary-foreground hover:underline flex items-center gap-2"
              >
                About TechAntum
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
