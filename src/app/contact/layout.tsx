import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - Start Your Project',
  description:
    'Contact TechAntum for website, web application, and mobile app development. Get a free consultation. Email: info@techantum.com. Phone: +91 40 40268570.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact TechAntum | Start Your Digital Project',
    description:
      'Get in touch with TechAntum for websites, web apps, and mobile application development.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
