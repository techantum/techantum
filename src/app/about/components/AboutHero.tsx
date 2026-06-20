import AppImage from '@/components/ui/AppImage';

export default function AboutHero() {
  return (
    <section className="py-16 bg-gradient-to-b from-muted to-background page-hero reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="reveal-left">
            <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-4 block">
              About TechAntum
            </span>
            <h1 className="font-bricolage text-5xl md:text-6xl font-bold text-foreground mb-6">
              Building Digital Products Since 2018
            </h1>
            <p className="font-inter text-lg text-muted-foreground mb-6">
              TechAntum is an IT company specializing in website development, custom web applications, and mobile app development for businesses of all sizes.
            </p>
            <p className="font-inter text-lg text-muted-foreground">
              From startups launching their first product to enterprises modernizing legacy systems, we deliver scalable, user-focused digital solutions with transparent communication and agile delivery.
            </p>
          </div>
          <div className="relative reveal-right">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <AppImage
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c"
                alt="TechAntum development team collaborating on a software project"
                className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>);

}
