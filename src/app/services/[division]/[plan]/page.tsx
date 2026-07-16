import { notFound } from 'next/navigation';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PlanPageContent from '../../components/PlanPageContent';
import { buildPageMetadata } from '@/lib/seo/page-metadata';
import {
  allPlanPaths,
  getDivision,
  getPlan,
  seoKeywordsByDivision,
  type DivisionSlug,
} from '@/lib/service-packages-data';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export function generateStaticParams() {
  return allPlanPaths.map(({ division, plan }) => ({ division, plan }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ division: string; plan: string }>;
}) {
  const { division: divisionSlug, plan: planSlug } = await params;
  const division = getDivision(divisionSlug);
  const plan = getPlan(divisionSlug, planSlug);
  if (!division || !plan) return {};

  return buildPageMetadata({
    path: `/services/${division.slug}/${plan.slug}`,
    title: `${plan.name} — ${division.name}`,
    description: plan.description,
    keywords: [plan.name, plan.bestFor, ...seoKeywordsByDivision[division.slug as DivisionSlug]],
  });
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ division: string; plan: string }>;
}) {
  const { division: divisionSlug, plan: planSlug } = await params;
  const division = getDivision(divisionSlug);
  const plan = getPlan(divisionSlug, planSlug);

  if (!division || !plan) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PlanPageContent division={division} plan={plan} />
      </main>
      <SiteFooter />
    </>
  );
}
