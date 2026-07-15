import Icon from '@/components/ui/AppIcon';
import type { PortfolioProject } from '@/lib/portfolio-data';

interface FeaturedProjectsSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  projects: PortfolioProject[];
}

export default function FeaturedProjectsSection({
  eyebrow,
  title,
  description,
  projects,
}: FeaturedProjectsSectionProps) {
  return (
    <section id="featured" className="page-section bg-muted/50 reveal">
      <div className="page-container">
        <div className="text-center mb-5">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            {eyebrow}
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 reveal reveal-stagger">
          {projects.map((project) => (
            <article
              key={project.id}
              className="bg-card rounded-2xl border border-border overflow-hidden hover-lift glow-card flex flex-col"
            >
              <div className="bg-brand-gradient p-4">
                <span className="font-inter text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">
                  {project.category}
                </span>
                <h3 className="font-bricolage text-2xl font-bold text-primary-foreground mt-2">
                  {project.name}
                </h3>
                <p className="font-inter text-sm text-primary-foreground/80 mt-1">{project.industry}</p>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <p className="font-inter text-sm text-muted-foreground mb-4 leading-relaxed flex-1">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-inter text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-inter text-sm font-medium text-primary hover:underline"
                >
                  Visit Project
                  <Icon name="ArrowTopRightOnSquareIcon" size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
