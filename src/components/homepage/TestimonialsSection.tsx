import Icon from '@/components/ui/AppIcon';

export default function TestimonialsSection() {
  const testimonials = [
    {
      id: 'test_1',
      name: 'Marcus Schmidt',
      country: 'Germany',
      company: 'Schmidt Foods GmbH',
      rating: 5,
      text: 'HFG has been our trusted supplier for sunflower oil for over 3 years. Consistent quality, competitive pricing, and reliable delivery every time. Highly recommend for wholesale food distributors.',
      product: 'Cooking Oils',
    },
    {
      id: 'test_2',
      name: 'Isabella Rodrigues',
      country: 'Brazil',
      company: 'Agro Brasil Ltda',
      rating: 5,
      text: 'The chicken feed quality is exceptional. Our poultry farm has seen improved growth rates and healthier birds since switching to HFG supplies. Professional service from start to finish.',
      product: 'Chicken Feed',
    },
    {
      id: 'test_3',
      name: 'Ahmed El-Mansouri',
      country: 'Morocco',
      company: 'Atlas Fertilizers',
      rating: 5,
      text: 'Outstanding NPK fertilizer quality at competitive wholesale prices. HFG understands the agricultural market and delivers exactly what farmers need. Excellent communication throughout.',
      product: 'Fertilizers',
    },
    {
      id: 'test_4',
      name: 'Sophie Dubois',
      country: 'Belgium',
      company: 'EcoHeat Solutions',
      rating: 5,
      text: 'Premium wood pellets with consistent BTU ratings. Perfect for our heating supply business. HFG handles large orders efficiently and maintains quality across all shipments.',
      product: 'Wood Pellets',
    },
  ]

  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Customer Reviews
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Trusted by Businesses Worldwide
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            See what our partners say about their experience with HFG wholesale supplies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {testimonials?.map((testimonial) => (
            <div
              key={testimonial?.id}
              className="bg-card p-6 rounded-2xl shadow-sm border border-border hover-lift"
            >
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial?.rating)]?.map((_, i) => (
                  <Icon key={i} name="StarIcon" size={20} className="text-accent" variant="solid" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="font-inter text-base text-foreground mb-6 leading-relaxed">
                "{testimonial?.text}"
              </p>

              {/* Author Info */}
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
                  {testimonial?.product}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
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