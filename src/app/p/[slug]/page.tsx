import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBranding, getCmsSection } from '@/lib/cms';
import { buildPageMetadata } from '@/lib/seo/page-metadata';
import CmsRichText from '@/components/cms/CmsRichText';
import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: page } = await supabase.from('cms_pages').select('label, description, is_enabled').eq('id', slug).maybeSingle();
  if (!page || page.is_enabled === false) return {};
  return buildPageMetadata({
    path: `/p/${slug}`,
    title: String(page.label || slug),
    description: String(page.description || `${page.label} — Techantum Solutions`),
  });
}

export default async function CustomCmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: page } = await supabase.from('cms_pages').select('*').eq('id', slug).maybeSingle();
  if (!page || page.is_enabled === false) notFound();

  const hero = await getCmsSection(`custom.${slug}.hero`);
  const branding = await getBranding();
  const data = hero.content;

  return (
    <>
      <Header branding={branding} />
      <main className="page-main">
        {hero.enabled ? (
          <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
            {data.heroPosterUrl ? (
              <SafeImage src={String(data.heroPosterUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            ) : null}
            <div className="relative page-container">
              <h1 className="font-bricolage text-4xl font-bold md:text-5xl">
                {String(data.titleLine1 || page.label)}
                {data.titleLine2 ? (
                  <>
                    <br />
                    {String(data.titleLine2)}
                  </>
                ) : null}
              </h1>
              <CmsRichText html={String(data.description || '')} className="mt-4 max-w-2xl text-white/80" />
              {data.primaryCta ? (
                <Link href={String(data.primaryCtaHref || '/contact')} className="mt-6 inline-flex rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-white">
                  {String(data.primaryCta)}
                </Link>
              ) : null}
            </div>
          </section>
        ) : (
          <div className="page-container py-24">
            <h1 className="font-bricolage text-3xl font-bold">{page.label}</h1>
            <p className="mt-2 text-slate-500">{page.description}</p>
          </div>
        )}
      </main>
      <Footer branding={branding} />
    </>
  );
}
