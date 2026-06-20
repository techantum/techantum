export default function PortfolioHero() {
  return (
    <section className="py-20 bg-gradient-to-b from-primary/5 via-background to-background grid-bg page-hero reveal">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-4 block">
          Our Work
        </span>
        <h1 className="font-bricolage text-5xl md:text-6xl font-bold text-foreground mb-6">
          Building Scalable
          <br />
          <span className="gradient-text">Digital Experiences</span>
        </h1>
        <p className="font-inter text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
          Web applications, SaaS platforms, enterprise websites, and industry-specific solutions — transforming ideas into powerful digital platforms.
        </p>
        <p className="font-inter text-base text-muted-foreground max-w-2xl mx-auto">
          Explore our portfolio across B2B, finance, education, healthcare, real estate, pharma, industrial, infrastructure, mining, and more.
        </p>
      </div>
    </section>
  );
}
