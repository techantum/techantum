import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/services',
    title: 'Our Services - Websites, Web Apps & Mobile Applications',
    description:
      'Explore TechAntum services: website development, custom web applications, and mobile app development for iOS and Android.',
  });
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
