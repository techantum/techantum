import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import type { PortfolioProject } from '@/lib/portfolio-data';
import PortfolioHero from './components/PortfolioHero';
import IndustriesSection from './components/IndustriesSection';
import FeaturedProjectsSection from './components/FeaturedProjectsSection';
import IndustryProjectsSection from './components/IndustryProjectsSection';
import PortfolioCTA from './components/PortfolioCTA';

interface Industry {
  id: string;
  name: string;
  icon: string;
}

interface IndustryProjectGroup {
  id: string;
  title: string;
  subtitle: string;
  projects: Array<{
    id: string;
    name: string;
    url: string;
    description: string;
    tags: string[];
  }>;
}

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function PortfolioPage() {
  const [heroContent, dataContent, ctaContent] = await Promise.all([
    getCmsContent('portfolio.hero'),
    getCmsContent('portfolio.data'),
    getCmsContent('portfolio.cta'),
  ]);

  const hero = mergeCmsContent('portfolio.hero', heroContent);
  const data = mergeCmsContent('portfolio.data', dataContent);
  const cta = mergeCmsContent('portfolio.cta', ctaContent);

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PortfolioHero
          eyebrow={String(hero.eyebrow)}
          title={String(hero.title)}
          description={String(hero.description)}
        />
        <IndustriesSection
          eyebrow={String(data.industriesEyebrow)}
          title={String(data.industriesTitle)}
          description={String(data.industriesDescription)}
          industries={(data.industries as Industry[]) ?? []}
        />
        <FeaturedProjectsSection
          eyebrow={String(data.featuredEyebrow)}
          title={String(data.featuredTitle)}
          description={String(data.featuredDescription)}
          projects={(data.featuredProjects as PortfolioProject[]) ?? []}
        />
        <IndustryProjectsSection
          groups={(data.industryProjectGroups as IndustryProjectGroup[]) ?? []}
        />
        <PortfolioCTA
          title={String(cta.title)}
          description={String(cta.description)}
          ctaText={String(cta.ctaText)}
          ctaHref={String(cta.ctaHref)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
