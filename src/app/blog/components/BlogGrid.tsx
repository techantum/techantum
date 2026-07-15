import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import type { BlogArticle } from '@/lib/blog-data';

export default function BlogGrid({ articles }: { articles: BlogArticle[] }) {
  return (
    <section className="page-section reveal">
      <div className="page-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 reveal reveal-stagger">
          {articles.map((article) => (
            <article
              key={article.id}
              className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover-lift group cursor-pointer"
            >
              <div className="relative h-64 overflow-hidden">
                <AppImage
                  src={article.image}
                  alt={article.imageAlt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-inter text-xs font-medium">
                    {article.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Icon name="CalendarIcon" size={14} />
                    {new Date(article.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="ClockIcon" size={14} />
                    {article.readTime}
                  </span>
                </div>

                <h2 className="font-bricolage text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {article.title}
                </h2>

                <p className="font-inter text-sm text-muted-foreground mb-4 leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="flex items-center gap-2 text-primary font-inter text-sm font-medium">
                  Read Article
                  <Icon name="ArrowRightIcon" size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
