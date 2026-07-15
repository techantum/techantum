import Icon from '@/components/ui/AppIcon';
import type { SiteBranding } from '@/lib/cms/types';

interface BusinessHour {
  id: string;
  label: string;
  value: string;
}

interface CompanyInfoProps {
  page: Record<string, unknown>;
  branding: SiteBranding;
}

export default function CompanyInfo({ page, branding }: CompanyInfoProps) {
  const businessHours = (page.businessHours as BusinessHour[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="font-bricolage text-xl font-semibold text-foreground mb-4">
          {String(page.sidebarContactTitle)}
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Icon name="MapPinIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-inter text-sm font-medium text-foreground mb-1">Address</p>
              <p className="font-inter text-sm text-muted-foreground whitespace-pre-line">
                {branding.address}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="PhoneIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-inter text-sm font-medium text-foreground mb-1">Phone</p>
              <a
                href={`tel:${branding.phone_href}`}
                className="font-inter text-sm text-primary hover:underline"
              >
                {branding.phone}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="ChatBubbleLeftRightIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-inter text-sm font-medium text-foreground mb-1">WhatsApp</p>
              <a
                href={`https://wa.me/${branding.whatsapp_href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-inter text-sm text-primary hover:underline"
              >
                {branding.whatsapp}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="EnvelopeIcon" size={20} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-inter text-sm font-medium text-foreground mb-1">Email</p>
              <a
                href={`mailto:${branding.email}`}
                className="font-inter text-sm text-primary hover:underline"
              >
                {branding.email}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="font-bricolage text-xl font-semibold text-foreground mb-4">
          {String(page.sidebarAboutTitle)}
        </h3>
        <div className="space-y-3">
          <div>
            <p className="font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Company
            </p>
            <p className="font-inter text-sm text-foreground">{String(page.sidebarAboutCompany)}</p>
          </div>
          <div>
            <p className="font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Services
            </p>
            <p className="font-inter text-sm text-foreground">{String(page.sidebarAboutServices)}</p>
          </div>
          <div>
            <p className="font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Established
            </p>
            <p className="font-inter text-sm text-foreground">{String(page.sidebarAboutEstablished)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="font-bricolage text-xl font-semibold text-foreground mb-4">
          {String(page.sidebarHoursTitle)}
        </h3>
        <div className="space-y-2">
          {businessHours.map((row) => (
            <div key={row.id} className="flex justify-between font-inter text-sm">
              <span className="text-foreground">{row.label}</span>
              <span className="text-muted-foreground">{row.value}</span>
            </div>
          ))}
        </div>
        <p className="font-inter text-xs text-muted-foreground mt-4">{String(page.hoursFootnote)}</p>
      </div>
    </div>
  );
}
