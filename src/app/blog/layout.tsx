import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - Web Development, Mobile Apps & Tech Insights',
  description:
    'Stay updated with TechAntum blog. Read about web development, mobile apps, SaaS, tech stack choices, and digital trends.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog | TechAntum - Tech Insights',
    description:
      'Expert articles on web development, mobile apps, and digital product strategy from TechAntum.',
    url: '/blog',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
