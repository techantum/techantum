import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PageHeroSection from '@/components/common/PageHeroSection';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import type { TestimonialItem } from '@/lib/testimonials-data';
import TestimonialsPageClient from './TestimonialsPageClient';

export default async function TestimonialsPage() {
  const [heroContent, pageContent] = await Promise.all([
    getCmsContent('testimonials.hero'),
    getCmsContent('testimonials.page'),
  ]);

  const heroData = mergeCmsContent('testimonials.hero', heroContent);
  const pageData = mergeCmsContent('testimonials.page', pageContent);

  const hero = {
    eyebrow: String(heroData.eyebrow),
    title: String(heroData.title),
    description: String(heroData.description),
  };
  const testimonials = (pageData.testimonials as TestimonialItem[]) ?? [];

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PageHeroSection eyebrow={hero.eyebrow} title={hero.title} description={hero.description} />
        <TestimonialsPageClient testimonials={testimonials} />
      </main>
      <SiteFooter />
    </>
  );
}
