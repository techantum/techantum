import Icon from '@/components/ui/AppIcon';
import type { TestimonialItem } from '@/lib/testimonials-data';

interface TestimonialGridProps {
  testimonials: TestimonialItem[];
  selectedCategory: string;
  selectedCountry: string;
}

export default function TestimonialGrid({
  testimonials,
  selectedCategory,
  selectedCountry,
}: TestimonialGridProps) {
  const filteredTestimonials = testimonials.filter((testimonial) => {
    const categoryMatch = selectedCategory === 'All' || testimonial.service === selectedCategory;
    const countryMatch = selectedCountry === 'All' || testimonial.country === selectedCountry;
    return categoryMatch && countryMatch;
  });

  return (
    <section className="page-section reveal">
      <div className="page-container">
        {filteredTestimonials.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-inter text-lg text-muted-foreground">
              No testimonials found for the selected filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 reveal reveal-stagger">
              {filteredTestimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-card p-4 rounded-2xl shadow-sm border border-border hover-lift"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Icon key={i} name="StarIcon" size={20} className="text-accent" variant="solid" />
                    ))}
                  </div>

                  <p className="font-inter text-base text-foreground mb-6 leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>

                  <div className="pt-4 border-t border-border">
                    <p className="font-inter font-semibold text-sm text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="font-inter text-xs text-muted-foreground">{testimonial.company}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-inter text-xs text-muted-foreground">
                        {testimonial.country}
                      </span>
                      <span className="font-inter text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {testimonial.service}
                      </span>
                    </div>
                    {testimonial.date && (
                      <p className="font-inter text-xs text-muted-foreground mt-2">
                        {new Date(testimonial.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="font-inter text-base text-muted-foreground mb-4">
                Showing {filteredTestimonials.length} of {testimonials.length} testimonials
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
