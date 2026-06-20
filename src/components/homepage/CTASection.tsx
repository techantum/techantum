import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export default function CTASection() {
  return (
    <section className="py-16 bg-primary reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Content */}
          <div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Ready to Start Your Order?
            </h2>
            <p className="font-inter text-lg text-primary-foreground/90 mb-6">
              Get a customized quote for your wholesale supply needs. Our team will respond within 24 hours with competitive pricing and delivery options.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">Competitive wholesale pricing</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">Fast quote turnaround (24 hours)</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">Flexible delivery options</span>
              </li>
              <li className="flex items-center gap-3 text-primary-foreground">
                <Icon name="CheckCircleIcon" size={24} variant="solid" />
                <span className="font-inter text-base">ISO certified quality assurance</span>
              </li>
            </ul>
          </div>

          {/* Right: CTA Buttons */}
          <div className="lg:text-right space-y-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-card text-foreground px-8 py-4 rounded-full font-inter font-semibold text-lg hover:bg-card/90 transition-all hover-lift btn-shine shadow-lg"
            >
              Request a Quote
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
                href="/products"
                className="font-inter text-base font-medium text-primary-foreground hover:underline flex items-center gap-2"
              >
                Browse All Products
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
              <Link
                href="/about"
                className="font-inter text-base font-medium text-primary-foreground hover:underline flex items-center gap-2"
              >
                Learn About HFG
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}