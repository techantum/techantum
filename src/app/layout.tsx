import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import CustomScripts from '@/components/CustomScripts';
import ScrollRevealProvider from '@/components/common/ScrollRevealProvider';
import WhatsAppWidgetLoader from '@/components/common/WhatsAppWidgetLoader';
import { getBranding, getSeo } from '@/lib/cms';
import { defaultSeo } from '@/lib/cms/default-content';
import { getMetadataBase } from '@/lib/cms/url';
import {
  buildMarketingBodyScripts,
  buildMarketingHeaderScripts,
} from '@/lib/seo/marketing-tags';
import '../styles/index.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [seo, branding] = await Promise.all([getSeo(), getBranding()]);

  const cacheKey = branding.favicon_url
    ? encodeURIComponent(branding.favicon_url.split('/').pop() || '1')
    : 'default';

  const otherVerification: Record<string, string> = {};
  if (seo.bing_verification) {
    otherVerification['msvalidate.01'] = seo.bing_verification;
  }

  return {
    metadataBase: getMetadataBase(seo.site_url),
    title: {
      default: seo.site_title || defaultSeo.site_title,
      template: seo.title_template || defaultSeo.title_template,
    },
    description: seo.description || defaultSeo.description,
    keywords: seo.keywords?.length ? seo.keywords : defaultSeo.keywords,
    authors: [{ name: 'TechAntum' }],
    creator: 'TechAntum',
    publisher: 'TechAntum',
    robots: {
      index: seo.index_site !== false,
      follow: seo.follow_site !== false,
      googleBot: {
        index: seo.index_site !== false,
        follow: seo.follow_site !== false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: `/favicon.ico?v=${cacheKey}`, sizes: 'any' },
        { url: `/icon?v=${cacheKey}`, type: 'image/png', sizes: '32x32' },
      ],
      apple: { url: `/apple-icon?v=${cacheKey}`, sizes: '180x180' },
      shortcut: `/favicon.ico?v=${cacheKey}`,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: 'TechAntum',
      title: seo.site_title || defaultSeo.site_title,
      description: seo.description || defaultSeo.description,
      images: [
        {
          url: seo.og_image_url || defaultSeo.og_image_url,
          width: 1200,
          height: 630,
          alt: 'TechAntum - Digital Solutions Company',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.site_title || defaultSeo.site_title,
      description: seo.description || defaultSeo.description,
      images: [seo.og_image_url || defaultSeo.og_image_url],
      creator: seo.twitter_handle || defaultSeo.twitter_handle,
    },
    verification: {
      google: seo.google_verification || defaultSeo.google_verification,
      other: Object.keys(otherVerification).length ? otherVerification : undefined,
    },
    other: seo.facebook_app_id
      ? {
          'fb:app_id': seo.facebook_app_id,
        }
      : undefined,
    alternates: {
      canonical: '/',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seo = await getSeo();
  const marketingHeader = buildMarketingHeaderScripts(seo);
  const marketingBody = buildMarketingBodyScripts(seo);
  const cmsTracksAnalytics = Boolean(seo.gtm_id?.trim() || seo.ga4_id?.trim());

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://assets.mixkit.co" />
        <link rel="dns-prefetch" href="https://assets.mixkit.co" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="manifest" href="/site.webmanifest" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
        />
        <CustomScripts html={marketingHeader} placement="header" />
        <CustomScripts html={seo.header_scripts || ''} placement="header" />
      </head>
      <body className="font-inter">
        <CustomScripts html={marketingBody} placement="footer" />
        {!cmsTracksAnalytics && (
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
        )}
        <WebVitalsReporter />
        <ScrollRevealProvider />
        {children}
        <WhatsAppWidgetLoader />
        <CustomScripts html={seo.footer_scripts || ''} placement="footer" />
      </body>
    </html>
  );
}
