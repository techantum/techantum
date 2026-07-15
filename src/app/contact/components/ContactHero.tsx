export default function ContactHero() {
  return (
    <section className="bg-gradient-to-b from-muted to-background page-hero reveal">
      <div className="page-container text-center">
        <span className="font-inter text-xs sm:text-sm uppercase tracking-wider text-primary font-medium mb-3 sm:mb-4 block">
          Get in Touch
        </span>
        <h1 className="font-bricolage text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6">
          Contact Us
        </h1>
        <p className="font-inter text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-2">
          Tell us about your project and get a free consultation. Our team responds to all inquiries within 24 hours.
        </p>
      </div>
    </section>
  );
}
