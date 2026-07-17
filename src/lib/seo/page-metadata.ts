import { Metadata } from 'next';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSeo } from '@/lib/cms';
import { defaultSeo } from '@/lib/cms/default-content';
import { resolveSiteUrl } from '@/lib/cms/url';
import type { SiteSeo } from '@/lib/cms/types';

export interface PageSeoRecord {
  path: string;
  index_enabled: boolean;
  follow_enabled: boolean;
  title: string | null;
  description: string | null;
  og_image_url: string | null;
  header_scripts: string;
  footer_scripts: string;
}

export interface PageMetadataInput {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  nofollow?: boolean;
}

export const getPageSeo = cache(async (path: string): Promise<PageSeoRecord | null> => {
  try {
    const supabase = createAdminClient();
    const normalized = path === '/' ? '/' : path.replace(/\/$/, '') || '/';
    const { data } = await supabase
      .from('page_seo')
      .select('*')
      .eq('path', normalized)
      .maybeSingle();
    return data as PageSeoRecord | null;
  } catch {
    return null;
  }
});

function resolveOgImage(seo: SiteSeo, ogImage?: string | null): string {
  const raw = ogImage || seo.og_image_url || defaultSeo.og_image_url;
  if (raw.startsWith('http')) return raw;
  return `${resolveSiteUrl(seo.site_url).replace(/\/$/, '')}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export async function buildPageMetadata(input: PageMetadataInput): Promise<Metadata> {
  const [globalSeo, pageSeo] = await Promise.all([getSeo(), getPageSeo(input.path)]);

  const title = pageSeo?.title || input.title;
  const description = pageSeo?.description || input.description;
  const canonicalPath = input.path === '/' ? '/' : input.path;
  const siteUrl = resolveSiteUrl(globalSeo.site_url);
  const canonicalUrl = `${siteUrl.replace(/\/$/, '')}${canonicalPath === '/' ? '' : canonicalPath}`;

  const index =
    globalSeo.index_site !== false &&
    pageSeo?.index_enabled !== false &&
    input.noindex !== true;
  const follow =
    globalSeo.follow_site !== false &&
    pageSeo?.follow_enabled !== false &&
    input.nofollow !== true;

  const ogImage = resolveOgImage(globalSeo, pageSeo?.og_image_url || input.ogImage);

  return {
    title,
    description,
    keywords: input.keywords?.length ? input.keywords : globalSeo.keywords,
    alternates: { canonical: canonicalPath },
    robots: {
      index,
      follow,
      googleBot: { index, follow, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'TechAntum',
      type: input.ogType || 'website',
      locale: 'en_US',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      creator: globalSeo.twitter_handle || defaultSeo.twitter_handle,
    },
  };
}
