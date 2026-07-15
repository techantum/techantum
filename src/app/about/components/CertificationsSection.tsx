import Icon from '@/components/ui/AppIcon';
import type { AboutCertification } from '@/lib/about-data';

interface GlanceStat {
  id: string;
  label: string;
  value: string;
}

interface CertificationsSectionProps {
  title: string;
  description: string;
  certifications: AboutCertification[];
  glanceTitle: string;
  glanceStats: GlanceStat[];
}

export default function CertificationsSection({
  title,
  description,
  certifications,
  glanceTitle,
  glanceStats,
}: CertificationsSectionProps) {
  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl mx-auto">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 reveal reveal-stagger">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="bg-card p-4 rounded-2xl shadow-sm border border-border hover-lift text-center"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon name={cert.icon as any} size={32} className="text-primary" />
              </div>
              <h3 className="font-bricolage text-lg font-semibold text-foreground mb-2">
                {cert.title}
              </h3>
              <p className="font-inter text-sm text-muted-foreground">{cert.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-card p-5 rounded-2xl shadow-sm border border-border text-center">
          <h3 className="font-bricolage text-2xl font-semibold text-foreground mb-4">{glanceTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {glanceStats.map((stat) => (
              <div key={stat.id}>
                <p className="font-inter text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="font-inter text-lg font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
