import { getDefaultContent } from '@/lib/cms/default-content';
import CmsRichText from '@/components/cms/CmsRichText';
import FAQAccordion from './FAQAccordion';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSection({ content }: { content?: Record<string, unknown> }) {
  const data = { ...getDefaultContent('homepage.faq'), ...content };
  const faqs = (data.faqs as FAQItem[]) || [];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/50 reveal">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8 reveal">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{String(data.title)}</h2>
          <CmsRichText
            html={String(data.description ?? '')}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          />
        </div>

        <FAQAccordion faqs={faqs} />
      </div>
    </section>
  );
}
