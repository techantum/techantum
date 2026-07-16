import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import HeroSection from './homepage/components/HeroSection';
import StatsSection from './homepage/components/StatsSection';
import ProductCategoriesSection from './homepage/components/ProductCategoriesSection';
import PartnerCountriesSection from './homepage/components/PartnerCountriesSection';
import TestimonialsSection from './homepage/components/TestimonialsSection';
import FAQSection from './homepage/components/FAQSection';
import CTASection from './homepage/components/CTASection';
import StructuredData from '@/components/StructuredData';
import { generateOrganizationSchema, generateFAQSchema } from '@/lib/seo';
import { getBranding, getCmsContent, getSeo } from '@/lib/cms';
import { getDefaultContent } from '@/lib/cms/default-content';
import { getSocialSameAsUrls } from '@/lib/seo/marketing-tags';

export default async function Homepage() {
  const [branding, seo] = await Promise.all([getBranding(), getSeo()]);
  const [hero, stats, services, techStack, testimonials, faq, cta] = await Promise.all([
    getCmsContent('homepage.hero'),
    getCmsContent('homepage.stats'),
    getCmsContent('homepage.services'),
    getCmsContent('homepage.tech_stack'),
    getCmsContent('homepage.testimonials'),
    getCmsContent('homepage.faq'),
    getCmsContent('homepage.cta'),
  ]);

  const faqItems = ((faq.faqs as { question: string; answer: string }[]) ||
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
        <HeroSection content={hero} />
        <StatsSection content={stats} />
        <ProductCategoriesSection content={services} />
        <PartnerCountriesSection content={techStack} />
        <TestimonialsSection content={testimonials} />
        <FAQSection content={faq} />
        <CTASection content={cta} branding={branding} />
      </main>
      <Footer branding={branding} />
    </>
  );
}
