import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Testimonials - What Our Clients Say',
  description:
    'Read real testimonials from TechAntum clients. Discover why businesses trust us for website, web app, and mobile application development.',
  alternates: {
    canonical: '/testimonials',
  },
  openGraph: {
    title: 'Client Testimonials | TechAntum',
    description:
      'Trusted by businesses worldwide. Read what our clients say about our development services.',
    url: '/testimonials',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
