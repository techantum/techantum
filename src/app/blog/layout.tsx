import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/blog',
    title: 'Blog - Web Development, Mobile Apps & Tech Insights',
    description:
      'Stay updated with TechAntum blog. Read about web development, mobile apps, SaaS, tech stack choices, and digital trends.',
  });
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
