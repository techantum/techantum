import { Metadata } from 'next';

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

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description:
      'IT company specializing in website development, custom web applications, and mobile app development for businesses worldwide.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500033',
      streetAddress: 'Plot no 118, 3rd Floor, Brundavanam, Road no 3 Kakatiya Hills, Guttala_Begumpet Madhapur, Jubilee Hills',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'info@techantum.com',
      availableLanguage: ['English', 'Dutch'],
    },
    sameAs: [
      'https://www.linkedin.com/company/techantum',
      'https://twitter.com/techantum',
    ],
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
