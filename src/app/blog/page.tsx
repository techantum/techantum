import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PageHeroSection from '@/components/common/PageHeroSection';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import type { BlogArticle } from '@/lib/blog-data';
import BlogGrid from './components/BlogGrid';

/** Public marketing page — SSG at build time, ISR every 5 minutes. */
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function BlogPage() {
  const [heroContent, postsContent] = await Promise.all([
    getCmsContent('blog.hero'),
    getCmsContent('blog.posts'),
  ]);

  const hero = mergeCmsContent('blog.hero', heroContent);
  const posts = mergeCmsContent('blog.posts', postsContent);
  const articles = (posts.articles as BlogArticle[]) ?? [];

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <PageHeroSection
          eyebrow={String(hero.eyebrow)}
          title={String(hero.title)}
          description={String(hero.description)}
        />
        <BlogGrid articles={articles} />
      </main>
      <SiteFooter />
    </>
  );
}
