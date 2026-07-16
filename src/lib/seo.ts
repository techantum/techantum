import { Metadata } from 'next';
import type { SiteBranding } from '@/lib/cms/types';
import { defaultBranding } from '@/lib/cms/default-content';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noindex?: boolean;
  nofollow?: boolean;
}

const SITE_NAME = 'TechAntum';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/images/og-default.jpg`;

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = 'website',
    noindex = false,
    nofollow = false,
  } = config;

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: ogType,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@techantum',
    },
  };
}

export function generateProductSchema(product: {
  name: string;
  description: string;
  image?: string;
  category: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image || DEFAULT_OG_IMAGE,
    brand: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    category: product.category,
    offers: {
      '@type': 'AggregateOffer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'EUR',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  };
}

export function generateOrganizationSchema(
  branding: SiteBranding = defaultBranding,
  sameAsUrls?: string[]
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com';
  const sameAs =
    sameAsUrls && sameAsUrls.length > 0
      ? sameAsUrls
      : ['https://www.linkedin.com/company/techantum', 'https://twitter.com/techantum'];

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: branding.company_name,
    url: siteUrl,
    logo: `${siteUrl}/icon-512.png`,
    description: branding.footer_description,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500033',
      streetAddress: branding.address,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: branding.email,
      availableLanguage: ['English', 'Dutch'],
    },
    sameAs,
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
