import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export default function PortfolioCTA() {
  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-brand-gradient rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative z-10">
            <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Let&apos;s Build Something Exceptional
            </h2>
            <p className="font-inter text-lg text-primary-foreground/90 max-w-2xl mx-auto mb-8">
              We help businesses transform ideas into scalable digital platforms — from strategy and design to development and deployment.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-card text-foreground px-8 py-4 rounded-full font-inter font-semibold hover:bg-card/90 transition-all hover-lift btn-shine shadow-lg"
            >
              Start Your Project
              <Icon name="ArrowRightIcon" size={20} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
