import Icon from '@/components/ui/AppIcon';
import { featuredProjects } from '@/lib/portfolio-data';

export default function FeaturedProjectsSection() {
  return (
    <section id="featured" className="py-16 bg-muted/50 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Featured Projects
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Flagship Platforms
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            Scalable, conversion-focused digital products built for real business impact.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 reveal reveal-stagger">
          {featuredProjects.map((project) => (
            <article
              key={project.id}
              className="bg-card rounded-2xl border border-border overflow-hidden hover-lift glow-card flex flex-col"
            >
              <div className="bg-brand-gradient p-6">
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
