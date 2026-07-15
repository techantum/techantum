import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/contact',
    title: 'Contact Us - Start Your Project',
    description:
      'Contact TechAntum for website, web application, and mobile app development. Get a free consultation. Email: info@techantum.com. Phone: +91 40 40268570.',
  });
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
