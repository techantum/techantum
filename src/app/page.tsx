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

const faqData = [
  {
    question: 'What services does TechAntum offer?',
    answer:
      'We build websites, web applications, and mobile applications. This includes corporate websites, e-commerce stores, custom web apps, SaaS platforms, admin dashboards, native iOS/Android apps, and cross-platform mobile apps.',
  },
  {
    question: 'What technologies do you use?',
    answer:
      'We use React, Next.js, TypeScript, Node.js, React Native, Flutter, and cloud platforms like AWS and Supabase. We select the best technology stack based on your project requirements.',
  },
  {
    question: 'How long does a typical project take?',
    answer:
      'A website typically takes 2–6 weeks, a web application 6–16 weeks, and a mobile app 8–20 weeks. We provide a detailed timeline during the proposal phase.',
  },
  {
    question: 'Do you provide support after launch?',
    answer:
      'Yes. We offer maintenance packages covering bug fixes, security updates, performance monitoring, and feature additions to keep your product running smoothly.',
  },
];

export default function Homepage() {
  return (
    <>
      <StructuredData data={[generateOrganizationSchema(), generateFAQSchema(faqData)]} />
      <Header />
      <main className="min-h-screen">
        <HeroSection />
        <StatsSection />
        <ProductCategoriesSection />
        <PartnerCountriesSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
