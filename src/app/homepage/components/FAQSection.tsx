'use client';
import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What services does TechAntum offer?',
    answer: 'We specialize in three core areas: Websites (corporate sites, landing pages, e-commerce, CMS-powered sites), Web Applications (custom apps, SaaS platforms, admin dashboards, API development), and Mobile Applications (native iOS/Android and cross-platform apps with React Native and Flutter).',
  },
  {
    question: 'How do I start a project with TechAntum?',
    answer: 'Reach out through our contact form, email us at info@techantum.com, or call us directly. Share your project idea, goals, and timeline. We\'ll schedule a free consultation and provide a detailed proposal within 48 hours.',
  },
  {
    question: 'What technologies do you use?',
    answer: 'We build with modern, industry-standard technologies including React, Next.js, TypeScript, Node.js, React Native, Flutter, and cloud platforms like AWS and Supabase. We choose the best stack for each project based on your requirements.',
  },
  {
    question: 'How long does a typical project take?',
    answer: 'Timelines vary by scope: a website typically takes 2–6 weeks, a web application 6–16 weeks, and a mobile app 8–20 weeks. We provide a detailed timeline during the proposal phase and keep you updated throughout development.',
  },
  {
    question: 'Do you provide ongoing support after launch?',
    answer: 'Yes. We offer maintenance and support packages covering bug fixes, security updates, performance monitoring, and feature additions. We\'re committed to your product\'s long-term success, not just the initial launch.',
  },
  {
    question: 'Can you work with our existing team or codebase?',
    answer: 'Absolutely. We frequently collaborate with in-house teams, integrate with existing systems, and take over legacy codebases for modernization. We adapt to your workflow — whether you need a full team or augmentation.',
  },
  {
    question: 'What is your development process?',
    answer: 'We follow an agile methodology: discovery and planning, UI/UX design, iterative development with regular demos, testing and QA, deployment, and post-launch support. You\'ll have visibility into progress at every stage.',
  },
  {
    question: 'How much does a project cost?',
    answer: 'Pricing depends on scope, complexity, and timeline. We offer fixed-price quotes for well-defined projects and flexible engagement for ongoing work. Contact us for a free estimate tailored to your needs.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/50 reveal">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12 reveal">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Got questions? We have answers. Learn more about our services, process, and how we work.
          </p>
        </div>

        <div className="space-y-4 reveal reveal-stagger">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all duration-300 hover-lift"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
                aria-expanded={openIndex === index}
              >
                <span className="text-lg font-semibold text-foreground pr-4">
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
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center reveal">
          <p className="text-muted-foreground mb-4">
            Still have questions? We&apos;re here to help!
          </p>
          <a
            href="/contact"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors duration-300 shadow-md hover:shadow-lg btn-shine"
          >
            Contact Us Today
          </a>
        </div>
      </div>
    </section>
  );
}
