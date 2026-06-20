import Script from 'next/script';

interface ProductSchemaProps {
  products: Array<{
    id: string;
    name: string;
    description: string;
    image: string;
    category: string;
    specifications?: string[];
    price?: {
      min: number;
      max: number;
      currency: string;
    };
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    rating?: {
      value: number;
      count: number;
    };
  }>;
}

export default function ProductSchemaLD({ products }: ProductSchemaProps) {
  const schemaData = products.map((product) => ({
    '@context': 'https://schema.org/',
    '@type': 'Product',
    '@id': `https://hollandsefg.com/products#${product.id}`,
    name: product.name,
    description: product.description,
    image: product.image,
    brand: {
      '@type': 'Brand',
      name: 'Hollandse FG B.V',
      logo: 'https://hollandsefg.com/icon-512.png',
    },
    manufacturer: {
      '@type': 'Organization',
      name: 'Hollande SeFG BV',
      url: 'https://hollandsefg.com',
    },
    category: product.category,
    offers: {
      '@type': 'AggregateOffer',
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      priceCurrency: product.price?.currency || 'EUR',
      lowPrice: product.price?.min || 0,
      highPrice: product.price?.max || 0,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        .toISOString()
        .split('T')[0],
      url: `https://hollandsefg.com/products#${product.id}`,
      seller: {
        '@type': 'Organization',
        name: 'Hollande SeFG BV',
        url: 'https://hollandsefg.com',
      },
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating.value,
          bestRating: 5,
          worstRating: 1,
          ratingCount: product.rating.count,
          reviewCount: product.rating.count,
        }
      : undefined,
    additionalProperty: product.specifications?.map((spec) => ({
      '@type': 'PropertyValue',
      name: 'Specification',
      value: spec,
    })),
  }));

  return (
    <Script
      id="product-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}