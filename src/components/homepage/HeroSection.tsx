import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <AppImage
          src="https://img.rocket.new/generatedImages/rocket_gen_img_163304424-1769342533244.png"
          alt="Modern warehouse facility with organized shelves of wholesale products and industrial equipment"
          className="w-full h-full object-cover"
          priority />
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      {/* Floating Data Badge */}
      <div className="absolute top-32 right-6 md:right-12 z-20 glass-effect px-4 py-2 rounded-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="font-inter text-xs font-medium text-foreground">ISO Certified Supplier</span>
      </div>

      {/* Content */}
      <div className="relative z-10 page-container grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Headline */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-12 bg-primary" />
            <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium">
              Est. 2018
            </span>
          </div>

          <h1 className="font-bricolage font-bold text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight mb-6">
            Quality Wholesale
            <br />
            <span className="text-primary">Supply Solutions</span>
          </h1>

          <p className="font-inter text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
            Leading distributor of cooking oils, chicken feed, fertilizers, wood pellets, and iron scraps. Serving 1000+ partners across 6+ countries with reliable, quality products.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-inter font-semibold text-base hover:bg-primary/90 transition-all hover-lift btn-shine inline-flex items-center gap-2">
              
              Request Quote
              <Icon name="ArrowRightIcon" size={20} />
            </Link>
            <Link
              href="/products"
              className="bg-card text-foreground border border-border px-8 py-4 rounded-full font-inter font-semibold text-base hover:bg-muted transition-all hover-lift">
              
              View Products
            </Link>
          </div>
        </div>

        {/* Right: Info Card */}
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="glass-effect p-5 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            
            <div className="relative z-10">
              <h3 className="font-bricolage font-semibold text-xl text-foreground mb-6">
                Why Choose HFG?
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon name="CheckBadgeIcon" size={20} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-sm text-foreground mb-1">
                      ISO Certified Quality
                    </h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      All products meet international quality standards
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <Icon name="GlobeAltIcon" size={20} className="text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-sm text-foreground mb-1">
                      Global Distribution
                    </h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      Partners in Belgium, Brazil, Morocco, Russia, Canada & more
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon name="TruckIcon" size={20} className="text-accent" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-sm text-foreground mb-1">
                      Reliable Delivery
                    </h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      On-time delivery with full logistics support
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                <div>
                  <p className="font-inter text-xs text-muted-foreground mb-1">Partners</p>
                  <p className="font-bricolage text-2xl font-bold text-foreground">1000+</p>
                </div>
                <div>
                  <p className="font-inter text-xs text-muted-foreground mb-1">Countries</p>
                  <p className="font-bricolage text-2xl font-bold text-foreground">6+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="font-inter text-xs uppercase tracking-wider text-muted-foreground">Scroll</span>
        <Icon name="ChevronDownIcon" size={20} className="text-muted-foreground" />
      </div>
    </section>);

}