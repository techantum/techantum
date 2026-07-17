import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/about',
    title: 'About Us - Our Mission, Values & Team',
    description:
      'Learn about TechAntum, an IT company specializing in websites, web applications, and mobile app development. Discover our mission, history, and core values.',
  });
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
