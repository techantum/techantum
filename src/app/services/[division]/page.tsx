import { notFound } from 'next/navigation';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import DivisionPageContent from '../components/DivisionPageContent';
import { buildPageMetadata } from '@/lib/seo/page-metadata';
import {
  allDivisionSlugs,
  getDivision,
  seoKeywordsByDivision,
  type DivisionSlug,
} from '@/lib/service-packages-data';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export function generateStaticParams() {
  return allDivisionSlugs.map((division) => ({ division }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const { division: slug } = await params;
  const division = getDivision(slug);
  if (!division) return {};

  return buildPageMetadata({
    path: `/services/${division.slug}`,
    title: `${division.name} — Launch, Growth & Enterprise Packages`,
    description: division.description,
    keywords: seoKeywordsByDivision[division.slug as DivisionSlug],
  });
}

export default async function DivisionPage({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const { division: slug } = await params;
  const division = getDivision(slug);

  if (!division) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <DivisionPageContent division={division} />
      </main>
      <SiteFooter />
    </>
  );
}
