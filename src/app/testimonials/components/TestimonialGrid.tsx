import Icon from '@/components/ui/AppIcon';
import type { TestimonialItem } from '@/lib/testimonials-data';

interface TestimonialGridProps {
  testimonials: TestimonialItem[];
  selectedCategory: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name="StarIcon"
          size={20}
          className={star <= rating ? 'text-accent' : 'text-border'}
          variant={star <= rating ? 'solid' : 'outline'}
        />
      ))}
    </div>
  );
}

export default function TestimonialGrid({
  testimonials,
  selectedCategory,
}: TestimonialGridProps) {
  const filteredTestimonials = testimonials.filter((testimonial) => {
    return selectedCategory === 'All' || testimonial.service === selectedCategory;
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
                  <StarRating rating={testimonial.rating} />
                  <p className="font-inter text-base text-foreground mb-6 leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="font-inter font-semibold text-sm text-foreground">
                      {testimonial.company}
                    </p>
                    <span className="font-inter text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      {testimonial.service}
                    </span>
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
