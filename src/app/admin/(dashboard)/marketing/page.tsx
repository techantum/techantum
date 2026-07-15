import Link from 'next/link';
import {
  digitalTransformationJourney,
  getDivisionPath,
  getPlanPath,
  leadGenerationPlan,
  salesFunnelSteps,
  seoKeywordsByDivision,
  serviceDivisions,
  type DivisionSlug,
} from '@/lib/service-packages-data';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';

export default function MarketingAdminPage() {
  const funnelStages = [
    leadGenerationPlan.topOfFunnel,
    leadGenerationPlan.middleOfFunnel,
    leadGenerationPlan.bottomOfFunnel,
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader
        title="Marketing"
        description="Internal strategy reference — positioning, funnel, and SEO targets. Editable site copy is in Site Content."
        action={
          <Link
            href="/admin/content"
            className="text-sm font-medium text-primary hover:underline"
          >
            Edit site content →
          </Link>
        }
      />

      <AdminSection title="Positioning" description="Digital transformation partner — not a vendor.">
        <div className="flex flex-wrap gap-2">
          {digitalTransformationJourney.map((step, i) => (
            <span key={step} className="text-xs bg-muted px-3 py-1.5 rounded-full text-foreground">
              {i + 1}. {step}
            </span>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Sales funnel" description="Visitor journey from awareness to retention.">
        <div className="space-y-2">
          {salesFunnelSteps.map((step, index) => (
            <div
              key={step.action}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border text-sm"
            >
              <span className="text-xs font-semibold text-primary w-5">{index + 1}</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground w-24 shrink-0">
                {step.stage}
              </span>
              <span className="font-medium text-foreground">{step.action}</span>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Lead generation" description="Top, middle, and bottom of funnel tactics.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {funnelStages.map((funnel) => (
            <div key={funnel.title} className="rounded-lg border border-border p-4 bg-muted/20">
              <h3 className="font-semibold text-sm text-foreground">{funnel.title}</h3>
              <p className="text-xs text-primary font-medium mt-1 mb-3">Goal: {funnel.goal}</p>
              <ul className="space-y-1.5">
                {funnel.tactics.map((tactic) => (
                  <li key={tactic} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary">·</span>
                    {tactic}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AdminSection>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Service divisions & SEO
        </h2>
        {serviceDivisions.map((division) => (
          <AdminSection key={division.slug} title={division.name} description={division.marketingMessage}>
            <Link
              href={getDivisionPath(division.slug)}
              target="_blank"
              className="text-sm text-primary hover:underline inline-block mb-3"
            >
              View live page ↗
            </Link>
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">SEO keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {seoKeywordsByDivision[division.slug as DivisionSlug].map((keyword) => (
                  <span key={keyword} className="text-xs border border-border px-2 py-0.5 rounded-md">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {division.plans.map((plan) => (
                <Link
                  key={plan.slug}
                  href={getPlanPath(division.slug, plan.slug)}
                  target="_blank"
                  className="block p-3 rounded-lg border border-border hover:border-primary text-sm transition-colors"
                >
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.bestFor}</p>
                </Link>
              ))}
            </div>
          </AdminSection>
        ))}
      </div>

      <AdminSection title="Lead tracking">
        <p className="text-sm text-muted-foreground mb-3">
          Submissions include service package selection from the homepage hero and contact forms.
        </p>
        <Link href="/admin/submissions" className="text-sm font-medium text-primary hover:underline">
          View leads →
        </Link>
      </AdminSection>
    </div>
  );
}
