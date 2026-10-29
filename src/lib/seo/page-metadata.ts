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
  og_title?: string | null;
  og_description?: string | null;
  canonical_url?: string | null;
  primary_keyword?: string | null;
  secondary_keywords?: string[] | null;
  publish_state?: string | null;
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

const PRIVATE_PATHS = new Set(['/login', '/signup', '/thank-you']);

export async function buildPageMetadata(input: PageMetadataInput): Promise<Metadata> {
  const [globalSeo, pageSeo] = await Promise.all([getSeo(), getPageSeo(input.path)]);
  const published = pageSeo?.publish_state !== 'draft';

  const title = (published && pageSeo?.title) || input.title;
  const description = (published && pageSeo?.description) || input.description;
  const canonicalPath = input.path === '/' ? '/' : input.path;
  const siteUrl = resolveSiteUrl(globalSeo.site_url).replace(/\/$/, '');
  const canonicalUrl = (published && pageSeo?.canonical_url) || `${siteUrl}${canonicalPath === '/' ? '' : canonicalPath}`;

  const forcedPrivate = PRIVATE_PATHS.has(input.path);
  const index =
    globalSeo.index_site !== false &&
    pageSeo?.index_enabled !== false &&
    input.noindex !== true &&
    !forcedPrivate;
  const follow =
    globalSeo.follow_site !== false &&
    pageSeo?.follow_enabled !== false &&
    input.nofollow !== true &&
    !forcedPrivate;

  const ogImage = resolveOgImage(globalSeo, (published && pageSeo?.og_image_url) || input.ogImage);
  const ogTitle = (published && pageSeo?.og_title) || title;
  const ogDescription = (published && pageSeo?.og_description) || description;
  const keywords = [
    ...(pageSeo?.primary_keyword ? [pageSeo.primary_keyword] : []),
    ...((pageSeo?.secondary_keywords || []).filter(Boolean)),
    ...(input.keywords || []),
  ];

  return {
    title,
    description,
    keywords: keywords.length ? [...new Set(keywords)] : globalSeo.keywords,
    alternates: { canonical: canonicalUrl },
    robots: {
      index,
      follow,
      googleBot: { index, follow, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      siteName: 'TechAntum',
      type: input.ogType || 'website',
      locale: 'en_US',
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
      creator: globalSeo.twitter_handle || defaultSeo.twitter_handle,
    },
  };
}
