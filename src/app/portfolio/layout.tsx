import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio - Industries & Projects',
  description:
    'Explore TechAntum portfolio across B2B, Finance, Education, Healthcare, Real Estate, Pharma, Industrial, Infrastructure, Mining, and Food & Beverage.',
  alternates: {
    canonical: '/portfolio',
  },
  openGraph: {
    title: 'Portfolio | TechAntum',
    description:
      'Featured projects and industry solutions delivered by TechAntum across multiple sectors.',
    url: '/portfolio',
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
