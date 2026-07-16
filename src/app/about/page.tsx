import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import { defaultAboutPageContent } from '@/lib/about-data';
import AboutHero from './components/AboutHero';
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
  const [heroContent, pageContent] = await Promise.all([
    getCmsContent('about.hero'),
    getCmsContent('about.page'),
  ]);

  const hero = mergeCmsContent('about.hero', heroContent);
  const page = mergeCmsContent('about.page', pageContent) as unknown as AboutPageContent;

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
        <MissionSection
          title={page.missionTitle}
          description={page.missionDescription}
          cards={page.missionCards}
        />
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
