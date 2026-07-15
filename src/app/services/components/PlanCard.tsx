import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import type { ServiceDivision, ServicePlan } from '@/lib/service-packages-data';
import { getContactHref, getPlanPath } from '@/lib/service-packages-data';

export default function PlanCard({
  division,
  plan,
}: {
  division: ServiceDivision;
  plan: ServicePlan;
}) {
  const highlights = plan.includes ?? plan.features ?? plan.solutions ?? [];
  const previewItems = highlights.slice(0, 4);

  return (
    <div
      className={`relative flex flex-col bg-card rounded-2xl border overflow-hidden hover-lift ${
        plan.highlighted ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border'
      }`}
    >
      {plan.highlighted && (
        <span className="absolute top-4 right-4 font-inter text-xs font-semibold uppercase tracking-wide bg-primary text-primary-foreground px-3 py-1 rounded-full">
          Popular
        </span>
      )}
      <div className="p-5 flex flex-col flex-1">
        <p className="font-inter text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {plan.bestFor}
        </p>
        <h3 className="font-bricolage text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
        <p className="font-inter text-sm text-muted-foreground mb-4">{plan.tagline}</p>
        {plan.scope && (
          <p className="font-inter text-sm font-medium text-primary mb-4">{plan.scope}</p>
        )}
        <p className="font-inter text-sm text-muted-foreground mb-6">{plan.description}</p>

        <ul className="space-y-2 mb-8 flex-1">
          {previewItems.map((item) => (
            <li key={item} className="flex items-start gap-2 font-inter text-sm text-foreground">
              <Icon name="CheckCircleIcon" size={18} className="text-primary shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
          {highlights.length > 4 && (
            <li className="font-inter text-sm text-muted-foreground pl-7">
              +{highlights.length - 4} more included
            </li>
          )}
        </ul>

        <div className="flex flex-col gap-3">
          <Link
            href={getPlanPath(division.slug, plan.slug)}
            className="inline-flex items-center justify-center gap-2 font-inter text-sm font-medium text-primary hover:underline"
          >
            View full details
            <Icon name="ArrowRightIcon" size={16} />
          </Link>
          <Link
            href={getContactHref(division, plan)}
            className={`inline-flex items-center justify-center font-inter text-sm font-medium px-5 py-2.5 rounded-full transition-colors ${
              plan.highlighted
                ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Book Free Consultation
          </Link>
        </div>
      </div>
    </div>
  );
}
