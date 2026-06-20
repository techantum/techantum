import Icon from '@/components/ui/AppIcon';
import { industryProjectGroups } from '@/lib/portfolio-data';

export default function IndustryProjectsSection() {
  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Industry Solutions
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Projects by Industry
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            Sector-specific platforms designed for engagement, lead generation, and long-term growth.
          </p>
        </div>

        <div className="space-y-16">
          {industryProjectGroups.map((group) => (
            <div key={group.id} id={group.id} className="reveal">
              <div className="mb-8 reveal-left">
                <h3 className="font-bricolage text-3xl font-bold text-foreground mb-2">{group.title}</h3>
                <p className="font-inter text-base text-muted-foreground max-w-3xl">{group.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal reveal-stagger">
                {group.projects.map((project) => (
                  <article
                    key={project.id}
                    className="bg-card rounded-2xl border border-border p-6 hover-lift glow-card"
                  >
                    <h4 className="font-bricolage text-xl font-semibold text-foreground mb-2">
                      {project.name}
                    </h4>
                    <p className="font-inter text-sm text-muted-foreground mb-4 leading-relaxed">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-inter text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full"
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
                      View Live Site
                      <Icon name="ArrowTopRightOnSquareIcon" size={16} />
                    </a>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
