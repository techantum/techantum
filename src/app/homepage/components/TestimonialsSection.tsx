import Icon from '@/components/ui/AppIcon';

export default function TestimonialsSection() {
  const testimonials = [
    {
      id: 'test_1',
      name: 'Marcus Schmidt',
      country: 'Germany',
      company: 'Schmidt Digital GmbH',
      rating: 5,
      text: 'TechAntum rebuilt our corporate website from scratch. The new site loads fast, looks professional, and our lead inquiries increased by 40% within the first month.',
      service: 'Websites',
    },
    {
      id: 'test_2',
      name: 'Isabella Rodrigues',
      country: 'Brazil',
      company: 'AgroTech Solutions',
      rating: 5,
      text: 'They developed a custom web application for our inventory management. The team was responsive, delivered on time, and the app has streamlined our entire operation.',
      service: 'Web Applications',
    },
    {
      id: 'test_3',
      name: 'Ahmed El-Mansouri',
      country: 'Morocco',
      company: 'Atlas Logistics',
      rating: 5,
      text: 'Our mobile app for delivery tracking was built flawlessly. TechAntum handled everything from UI design to App Store deployment. Highly recommended.',
      service: 'Mobile Applications',
    },
    {
      id: 'test_4',
      name: 'Sophie Dubois',
      country: 'Belgium',
      company: 'EcoHeat Solutions',
      rating: 5,
      text: 'We needed a SaaS dashboard for our clients and TechAntum delivered beyond expectations. Clean code, great UX, and excellent post-launch support.',
      service: 'Web Applications',
    },
  ]

  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Client Reviews
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Trusted by Businesses Worldwide
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            See what our clients say about working with TechAntum on their digital projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 reveal reveal-stagger">
          {testimonials?.map((testimonial) => (
            <div
              key={testimonial?.id}
              className="bg-card p-6 rounded-2xl shadow-sm border border-border hover-lift"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial?.rating)]?.map((_, i) => (
                  <Icon key={i} name="StarIcon" size={20} className="text-accent" variant="solid" />
                ))}
              </div>

              <p className="font-inter text-base text-foreground mb-6 leading-relaxed">
                &ldquo;{testimonial?.text}&rdquo;
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-inter font-semibold text-sm text-foreground">
                    {testimonial?.name}
                  </p>
                  <p className="font-inter text-xs text-muted-foreground">
                    {testimonial?.company} · {testimonial?.country}
                  </p>
                </div>
                <span className="font-inter text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {testimonial?.service}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="/testimonials"
            className="inline-flex items-center gap-2 font-inter text-base font-medium text-primary hover:underline"
          >
            View All Testimonials
            <Icon name="ArrowRightIcon" size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}
