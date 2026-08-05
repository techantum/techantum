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
    <section className="page-section bg-muted/40 reveal">
      <div className="page-container">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <span className="font-inter text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3 block">
            {String(data.eyebrow)}
          </span>
          <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-3">{String(data.title)}</h2>
          <CmsRichText html={String(data.description ?? '')} className="font-inter text-base text-muted-foreground" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 reveal reveal-stagger">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-card p-5 rounded-lg border border-border">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Icon key={i} name="StarIcon" size={16} className="text-secondary" variant="solid" />
                ))}
              </div>
              <p className="font-inter text-sm text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-inter font-semibold text-sm text-foreground">{testimonial.name}</p>
                  <p className="font-inter text-xs text-muted-foreground">
                    {testimonial.company} · {testimonial.country}
                  </p>
                </div>
                <span className="font-inter text-xs font-medium text-foreground bg-muted px-3 py-1 rounded-md">
                  {testimonial.service}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a href="/testimonials" className="inline-flex items-center gap-2 font-inter text-sm font-medium text-primary hover:underline">
            View all testimonials
            <Icon name="ArrowRightIcon" size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
