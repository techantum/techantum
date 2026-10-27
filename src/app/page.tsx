import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import HeroSection from './homepage/components/HeroSection';
import StatsSection from './homepage/components/StatsSection';
import ProductCategoriesSection from './homepage/components/ProductCategoriesSection';
import PartnerCountriesSection from './homepage/components/PartnerCountriesSection';
import IndustriesServedSection from '@/components/homepage/IndustriesServedSection';
import TestimonialsSection from './homepage/components/TestimonialsSection';
import FAQSection from './homepage/components/FAQSection';
import CTASection from './homepage/components/CTASection';
import StructuredData from '@/components/StructuredData';
import { generateOrganizationSchema, generateFAQSchema } from '@/lib/seo';
import { getBranding, getCmsSection, getSeo } from '@/lib/cms';
import { getDefaultContent } from '@/lib/cms/default-content';
import { defaultIndustriesServed } from '@/lib/techantum-defaults';
import { getSocialSameAsUrls } from '@/lib/seo/marketing-tags';
import { buildPageMetadata } from '@/lib/seo/page-metadata';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export async function generateMetadata() {
  const seo = await getSeo();
  return buildPageMetadata({
    path: '/',
    title: seo.site_title,
    description: seo.description,
  });
}

export default async function Homepage() {
  const [branding, seo] = await Promise.all([getBranding(), getSeo()]);
  const [hero, stats, services, techStack, testimonials, faq, cta, industriesContent] = await Promise.all([
    getCmsSection('homepage.hero'),
    getCmsSection('homepage.stats'),
    getCmsSection('homepage.services'),
    getCmsSection('homepage.tech_stack'),
    getCmsSection('homepage.testimonials'),
    getCmsSection('homepage.faq'),
    getCmsSection('homepage.cta'),
    getCmsSection('industries.served'),
  ]);

  const industries = {
    ...defaultIndustriesServed,
    ...industriesContent.content,
  };
  const industryItems = (industries.industries as typeof defaultIndustriesServed.industries) ?? [];

  const faqItems = ((faq.content.faqs as { question: string; answer: string }[]) ||
    (getDefaultContent('homepage.faq').faqs as { question: string; answer: string }[]));

  return (
    <>
      <StructuredData
        data={[
          generateOrganizationSchema(branding, getSocialSameAsUrls(seo)),
          generateFAQSchema(faqItems),
        ]}
      />
      <Header branding={branding} />
      <main className="min-h-screen">
        {hero.enabled ? <HeroSection content={hero.content} /> : null}
        {stats.enabled ? <StatsSection content={stats.content} /> : null}
        {services.enabled ? <ProductCategoriesSection content={services.content} /> : null}
        {industriesContent.enabled ? (
        <IndustriesServedSection
          title={String(industries.title)}
          description={String(industries.description)}
          industries={industryItems}
        />
        ) : null}
        {techStack.enabled ? <PartnerCountriesSection content={techStack.content} /> : null}
        {testimonials.enabled ? <TestimonialsSection content={testimonials.content} /> : null}
        {faq.enabled ? <FAQSection content={faq.content} /> : null}
        {cta.enabled ? <CTASection content={cta.content} branding={branding} /> : null}
      </main>
      <Footer branding={branding} />
    </>
  );
}
