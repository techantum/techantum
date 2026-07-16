import Link from 'next/link';
import type { ServiceDivision } from '@/lib/service-packages-data';
import { getContactHref, getPlanPath } from '@/lib/service-packages-data';

function CellValue({ value }: { value: string }) {
  if (value === '✓') {
    return <span className="text-primary font-semibold" aria-label="Included">✓</span>;
  }
  if (value === '—') {
    return <span className="text-muted-foreground" aria-label="Not included">—</span>;
  }
  return <span className="text-foreground">{value}</span>;
}

export default function PackageComparisonTable({ division }: { division: ServiceDivision }) {
  const plans = division.plans;

  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-6">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Feature Comparison
          </span>
          <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-foreground mb-3">
            Compare {division.shortName} Packages
          </h2>
          <p className="font-inter text-muted-foreground max-w-2xl mx-auto">
            See exactly what&apos;s included in each plan so you can pick the right fit for your stage.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/80">
                <th className="text-left font-bricolage font-semibold text-foreground px-4 py-3 border-b border-border sticky left-0 bg-muted/80 z-10">
                  Features
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.slug}
                    className={`text-center font-bricolage font-semibold px-4 py-3 border-b border-border ${
                      plan.highlighted ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    <Link
                      href={getPlanPath(division.slug, plan.slug)}
                      className="hover:underline"
                    >
                      {plan.name}
                    </Link>
                    <p
                      className={`font-inter text-xs font-normal mt-1 ${
                        plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}
                    >
                      {plan.bestFor}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {division.comparisonRows.map((row, idx) => (
                <tr
                  key={row.feature}
                  className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                >
                  <td className="text-left font-inter font-medium text-foreground px-4 py-2.5 border-b border-border sticky left-0 bg-inherit z-10">
                    {row.feature}
                  </td>
                  {plans.map((plan) => (
                    <td
                      key={plan.slug}
                      className={`text-center font-inter px-4 py-2.5 border-b border-border ${
                        plan.highlighted ? 'bg-primary/5' : ''
                      }`}
                    >
                      <CellValue value={row.values[plan.slug] ?? '—'} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-4 py-4 border-t border-border sticky left-0 bg-card z-10" />
                {plans.map((plan) => (
                  <td key={plan.slug} className="px-4 py-4 border-t border-border text-center">
                    <Link
                      href={getContactHref(division, plan)}
                      className={`inline-flex items-center justify-center font-inter text-xs font-medium px-4 py-2 rounded-full transition-colors ${
                        plan.highlighted
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      Book Consultation
                    </Link>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
