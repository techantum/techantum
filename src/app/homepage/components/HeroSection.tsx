import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import HeroVideoBackground from '@/components/common/HeroVideoBackground';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <HeroVideoBackground />

      {/* Ambient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-secondary/20 blur-3xl pointer-events-none animate-float-delayed" />

      <div className="absolute top-32 right-6 md:right-12 z-20 glass-effect px-4 py-2 rounded-full flex items-center gap-2 animate-hero-in animate-hero-in-delay-4">
        <span className="w-2 h-2 rounded-full bg-accent pulse-glow" />
        <span className="font-inter text-xs font-medium text-foreground">Available for new projects</span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3 mb-6 animate-hero-in animate-hero-in-delay-1">
            <span className="h-px w-12 bg-primary" />
            <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium">
              IT Services Company
            </span>
          </div>

          <h1 className="font-bricolage font-bold text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight mb-6 animate-hero-in animate-hero-in-delay-2">
            Build Your Digital
            <br />
            <span className="gradient-text">Future With Us</span>
          </h1>

          <p className="font-inter text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl animate-hero-in animate-hero-in-delay-3">
            TechAntum delivers custom websites, web applications, and mobile apps for businesses ready to grow online. From idea to launch — we handle it all.
          </p>

          <div className="flex flex-wrap gap-4 animate-hero-in animate-hero-in-delay-4">
            <Link
              href="/contact"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-inter font-semibold text-base hover:bg-primary/90 transition-all hover-lift btn-shine inline-flex items-center gap-2"
            >
              Start Your Project
              <Icon name="ArrowRightIcon" size={20} />
            </Link>
            <Link
              href="/services"
              className="bg-card/90 backdrop-blur text-foreground border border-border px-8 py-4 rounded-full font-inter font-semibold text-base hover:bg-muted transition-all hover-lift"
            >
              View Services
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5 lg:col-start-8 animate-hero-in animate-hero-in-delay-5">
          <div className="glass-effect p-8 rounded-2xl shadow-xl relative overflow-hidden hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />

            <div className="relative z-10">
              <h3 className="font-bricolage font-semibold text-xl text-foreground mb-6">
                Why Choose TechAntum?
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon name="CodeBracketIcon" size={20} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-sm text-foreground mb-1">
                      Modern Tech Stack
                    </h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      React, Next.js, TypeScript, and cloud-native architecture
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <Icon name="RocketLaunchIcon" size={20} className="text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-sm text-foreground mb-1">
                      End-to-End Delivery
                    </h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      Design, development, deployment, and ongoing support
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon name="UserGroupIcon" size={20} className="text-accent" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-sm text-foreground mb-1">
                      Client-Focused Approach
                    </h4>
                    <p className="font-inter text-sm text-muted-foreground">
                      Transparent communication and agile project management
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                <div>
                  <p className="font-inter text-xs text-muted-foreground mb-1">Projects Delivered</p>
                  <p className="font-bricolage text-2xl font-bold text-foreground">150+</p>
                </div>
                <div>
                  <p className="font-inter text-xs text-muted-foreground mb-1">Happy Clients</p>
                  <p className="font-bricolage text-2xl font-bold text-foreground">80+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce z-10">
        <span className="font-inter text-xs uppercase tracking-wider text-muted-foreground">Scroll</span>
        <Icon name="ChevronDownIcon" size={20} className="text-muted-foreground" />
      </div>
    </section>
  );
}
