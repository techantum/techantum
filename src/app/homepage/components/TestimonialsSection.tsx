import Icon from '@/components/ui/AppIcon';
import CmsRichText from '@/components/cms/CmsRichText';
import { getDefaultContent } from '@/lib/cms/default-content';

export default function TestimonialsSection({ content }: { content?: Record<string, unknown> }) {
  const data = { ...getDefaultContent('homepage.testimonials'), ...content };
  const testimonials = (data.testimonials as Array<{
    id: string;
    name: string;
    country: string;
    company: string;
    rating: number;
    text: string;
    service: string;
  }>) || [];

  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            {String(data.eyebrow)}
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">{String(data.title)}</h2>
          <CmsRichText html={String(data.description ?? '')} className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 reveal reveal-stagger">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-card p-4 rounded-2xl shadow-sm border border-border hover-lift">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Icon key={i} name="StarIcon" size={20} className="text-accent" variant="solid" />
                ))}
              </div>
              <p className="font-inter text-base text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-inter font-semibold text-sm text-foreground">{testimonial.name}</p>
                  <p className="font-inter text-xs text-muted-foreground">
                    {testimonial.company} · {testimonial.country}
                  </p>
                </div>
                <span className="font-inter text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {testimonial.service}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a href="/testimonials" className="inline-flex items-center gap-2 font-inter text-base font-medium text-primary hover:underline">
            View All Testimonials
            <Icon name="ArrowRightIcon" size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}
