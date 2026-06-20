import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - Our Mission, Values & Team',
  description:
    'Learn about TechAntum, an IT company specializing in websites, web applications, and mobile app development. Discover our mission, history, and core values.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About TechAntum | IT Services Company',
    description:
      'IT company building websites, web applications, and mobile apps for businesses worldwide since 2018.',
    url: '/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
