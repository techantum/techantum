import { buildPageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    path: '/portfolio',
    title: 'Portfolio - Industries & Projects',
    description:
      'Explore TechAntum portfolio across B2B, Finance, Education, Healthcare, Real Estate, Pharma, Industrial, Infrastructure, Mining, and Food & Beverage.',
  });
}

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
