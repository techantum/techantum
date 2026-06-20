import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Services - Websites, Web Apps & Mobile Applications',
  description:
    'Explore TechAntum services: website development, custom web applications, and mobile app development for iOS and Android.',
  alternates: {
    canonical: '/services',
  },
  openGraph: {
    title: 'Services | TechAntum',
    description:
      'Website development, web applications, and mobile app development services.',
    url: '/services',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
