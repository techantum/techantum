import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import { defaultAboutPageContent } from '@/lib/about-data';
import { defaultAboutOverview, defaultAboutUsp } from '@/lib/keil-defaults';
import AboutHero from './components/AboutHero';
import AboutOverviewSection from './components/AboutOverviewSection';
import AboutUSPSection from './components/AboutUSPSection';
import MissionSection from './components/MissionSection';
import TimelineSection from './components/TimelineSection';
import ValuesSection from './components/ValuesSection';
import PartnerCountriesGrid from './components/PartnerCountriesGrid';
import CertificationsSection from './components/CertificationsSection';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

type AboutPageContent = typeof defaultAboutPageContent;

export default async function AboutPage() {
  const [heroContent, pageContent, overviewContent, uspContent] = await Promise.all([
    getCmsContent('about.hero'),
    getCmsContent('about.page'),
    getCmsContent('about.overview'),
    getCmsContent('about.usp'),
  ]);

  const hero = mergeCmsContent('about.hero', heroContent);
  const page = mergeCmsContent('about.page', pageContent) as unknown as AboutPageContent;
  const overview = { ...defaultAboutOverview, ...mergeCmsContent('about.overview', overviewContent) } as typeof defaultAboutOverview;
  const usp = { ...defaultAboutUsp, ...mergeCmsContent('about.usp', uspContent) } as typeof defaultAboutUsp;

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <AboutHero
          eyebrow={String(hero.eyebrow)}
          title={String(hero.title)}
          description={String(hero.description)}
          description2={String(hero.description2 || '')}
          image={String(hero.image)}
          imageAlt={String(hero.imageAlt)}
        />
        <AboutOverviewSection content={overview} />
        <MissionSection
          title={page.missionTitle}
          description={page.missionDescription}
          cards={page.missionCards}
        />
        <AboutUSPSection content={usp} />
        <TimelineSection
          title={page.timelineTitle}
          description={page.timelineDescription}
          milestones={page.milestones}
        />
        <ValuesSection
          title={page.valuesTitle}
          description={page.valuesDescription}
          values={page.values}
        />
        <PartnerCountriesGrid
          title={page.regionsTitle}
          description={page.regionsDescription}
          regions={page.regions}
        />
        <CertificationsSection
          title={page.certificationsTitle}
          description={page.certificationsDescription}
          certifications={page.certifications}
          glanceTitle={page.glanceTitle}
          glanceStats={page.glanceStats}
        />
      </main>
      <SiteFooter />
    </>
  );
}
