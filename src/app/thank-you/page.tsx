import type { Metadata } from 'next';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import { buildPageMetadata } from '@/lib/seo/page-metadata';
import ThankYouRedirect from './ThankYouRedirect';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: '/thank-you',
    title: 'Thank You',
    description: 'Thank you for contacting TechAntum. We will respond to your inquiry shortly.',
    noindex: true,
    nofollow: true,
  });
}

export default function ThankYouPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <section className="page-section">
          <div className="page-container py-12 md:py-20">
            <ThankYouRedirect />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
