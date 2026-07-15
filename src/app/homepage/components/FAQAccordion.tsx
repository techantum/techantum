'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import CmsRichText from '@/components/cms/CmsRichText';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQAccordion({ faqs }: { faqs: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4 reveal reveal-stagger">
      {faqs.map((faq, index) => (
        <div key={faq.question} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            aria-expanded={openIndex === index}
          >
            <span className="font-inter font-semibold text-foreground pr-4">{faq.question}</span>
            <ChevronDownIcon
              className={`w-5 h-5 text-primary shrink-0 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
            />
          </button>
          {openIndex === index && (
            <div className="px-6 pb-6">
              <CmsRichText html={faq.answer} className="font-inter text-muted-foreground leading-relaxed" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
