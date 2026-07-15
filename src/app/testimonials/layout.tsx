import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/testimonials',
    title: 'Client Testimonials - What Our Clients Say',
    description:
      'Read real testimonials from TechAntum clients. Discover why businesses trust us for website, web app, and mobile application development.',
  });
}

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
