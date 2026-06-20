'use client';
import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What types of products does Hollandse Facility Group B.V. offer?',
    answer: 'We specialize in premium-quality agricultural and industrial products including Wood Pellets for sustainable heating, Chicken Feed formulated for optimal poultry health, Cooking Oils (sunflower, palm, and vegetable oils), Fertilizers for enhanced crop yields, and Iron Scraps for recycling industries. Each product meets international quality standards and is sourced from trusted suppliers across Europe and beyond.'
  },
  {
    question: 'How do I place an order with your company?',
    answer: 'Ordering is simple! Contact us through our contact form, email us at hollandsefgbv@gmail.com, or call our sales team directly. Share your product requirements, quantity needed, and delivery location. Our team will provide a detailed quote within 24 hours, including pricing, shipping options, and estimated delivery times. Once you approve, we process your order immediately and keep you updated throughout.'
  },
  {
    question: 'What countries do you ship to?',
    answer: 'We proudly serve customers across Europe, Africa, Asia, and the Middle East. Our extensive logistics network includes partnerships in the Netherlands, Germany, Belgium, Nigeria, Kenya, UAE, India, and many more countries. Whether you need bulk shipments to industrial facilities or smaller orders to remote locations, we have the infrastructure to deliver reliably and efficiently.'
  },
  {
    question: 'What quality standards do your products meet?',
    answer: 'Quality is our top priority. All our products comply with international certifications including ISO 9001 for quality management, HACCP for food safety (applicable to edible products), and EN Plus A1 for wood pellets. We conduct rigorous testing at every stage—from sourcing to packaging—ensuring you receive products that meet or exceed industry benchmarks. Our certifications are regularly audited by independent bodies.'
  },
  {
    question: 'What are your typical delivery times?',
    answer: 'Delivery times vary based on your location and order size. For European destinations, expect 5-10 business days. African and Asian markets typically receive shipments within 15-25 business days. We offer express shipping options for urgent orders. Once your order ships, you\'ll receive tracking information and regular updates until delivery is complete.'
  },
  {
    question: 'Do you offer bulk discounts for large orders?',
    answer: 'Absolutely! We understand that businesses need cost-effective solutions for bulk purchases. We offer competitive volume discounts on orders exceeding certain thresholds, flexible payment terms for established clients, and customized pricing for long-term contracts. Contact our sales team to discuss your specific needs and receive a tailored quote that maximizes your savings.'
  },
  {
    question: 'Can I request product samples before placing a large order?',
    answer: 'Yes, we encourage it! We offer product samples for qualified buyers to ensure our products meet your exact specifications before committing to bulk orders. Sample requests are processed quickly, and we can arrange shipping to your location. This allows you to test quality, verify specifications, and make informed purchasing decisions with confidence.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept multiple secure payment methods to accommodate international clients: bank wire transfers (SWIFT/SEPA), letters of credit (L/C) for large transactions, and escrow services for added security. For established customers, we also offer credit terms. All transactions are processed securely, and we provide detailed invoices and payment confirmations for your records.'
  },
  {
    question: 'How do you ensure products arrive in perfect condition?',
    answer: 'We take packaging and logistics seriously. Products are packaged using industry-standard materials designed to withstand long-distance transport—moisture-resistant bags for pellets and feed, sealed containers for oils, and reinforced pallets for fertilizers and scraps. We partner with reputable freight companies, provide full insurance coverage, and track every shipment in real-time to ensure safe, timely delivery.'
  },
  {
    question: 'What if I have a problem with my order?',
    answer: 'Customer satisfaction is our commitment. If any issues arise—damaged goods, delivery delays, or quality concerns—contact us immediately. Our dedicated support team responds within 24 hours and works quickly to resolve problems through replacements, refunds, or expedited re-shipments. We stand behind every product we sell and will make things right, guaranteed.'
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted reveal">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            FAQ
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            Got questions? We've got answers. Learn more about our products, ordering process, and commitment to quality.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                aria-expanded={openIndex === index}
              >
                <span className="font-inter text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </span>
                <ChevronDownIcon
                  className={`w-6 h-6 text-primary flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-5 pt-2">
                  <p className="font-inter text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="font-inter text-muted-foreground mb-4">
            Still have questions? We're here to help!
          </p>
          <a
            href="/contact"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-full font-inter font-semibold hover:bg-primary/90 transition-colors duration-300 shadow-md hover:shadow-lg btn-shine"
          >
            Contact Us Today
          </a>
        </div>
      </div>
    </section>
  );
}