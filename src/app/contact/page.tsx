import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PageHeroSection from '@/components/common/PageHeroSection';
import { getBranding, getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import type { SiteBranding } from '@/lib/cms/types';
import ContactForm from './components/ContactForm';
import CompanyInfo from './components/CompanyInfo';

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; plan?: string }>;
}) {
  const { service, plan } = await searchParams;
  const initialService = service ?? (plan ? `${service} — ${plan}` : undefined);

  const [heroContent, pageContent, branding] = await Promise.all([
    getCmsContent('contact.hero'),
    getCmsContent('contact.page'),
    getBranding(),
  ]);

  const hero = mergeCmsContent('contact.hero', heroContent);
  const page = mergeCmsContent('contact.page', pageContent);

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PageHeroSection
          eyebrow={String(hero.eyebrow)}
          title={String(hero.title)}
          description={String(hero.description)}
        />
        <div className="page-section reveal">
          <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 reveal reveal-stagger">
              <div className="lg:col-span-2">
                <ContactForm page={page} initialService={initialService} />
              </div>
              <div className="lg:col-span-1">
                <CompanyInfo page={page} branding={branding as SiteBranding} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
