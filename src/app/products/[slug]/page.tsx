import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import ServicePageClient from './ServicePageClient';
import CookingOilsSection from '../components/CookingOilsSection';
import ChickenFeedSection from '../components/ChickenFeedSection';
import FertilizersSection from '../components/FertilizersSection';
import WoodPelletsSection from '../components/WoodPelletsSection';
import IronScrapsSection from '../components/IronScrapsSection';

const serviceCategories: Record<string, {
  title: string;
  description: string;
  component: React.ComponentType;
}> = {
  'cooking-oils': {
    title: 'Cooking Oils - Premium Wholesale Cooking Oils',
    description:
      'Premium quality cooking oils including sunflower, palm, soybean, canola, olive, and coconut oil. Wholesale supply from Netherlands by Hollandse FG B.V.',
    component: CookingOilsSection,
  },
  'chicken-feed': {
    title: 'Chicken Feed - Poultry Feed & Nutrition Products',
    description:
      'High-quality chicken feed products: starter feed, grower feed, layer feed, broiler feed, and organic options. Wholesale poultry nutrition by Hollandse FG B.V.',
    component: ChickenFeedSection,
  },
  'fertilizers': {
    title: 'Fertilizers - Agricultural Fertilizers & Soil Nutrients',
    description:
      'Agricultural fertilizers including NPK, urea, DAP, potash, organic compost, and calcium nitrate. Wholesale supply by Hollandse FG B.V.',
    component: FertilizersSection,
  },
  'wood-pellets': {
    title: 'Wood Pellets - Premium Heating Wood Pellets',
    description:
      'High-quality wood pellets for residential and industrial heating. ENplus certified premium, industrial, softwood, and hardwood pellets by Hollandse FG B.V.',
    component: WoodPelletsSection,
  },
  'iron-scraps': {
    title: 'Iron Scraps - Steel & Metal Scrap Trading',
    description:
      'Premium iron and steel scrap: HMS 1, HMS 2, shredded steel, cast iron, and stainless steel scrap. Wholesale metal trading by Hollandse FG B.V.',
    component: IronScrapsSection,
  },
};

const validSlugs = Object.keys(serviceCategories);

export function generateStaticParams() {
  return validSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = serviceCategories[slug];
  if (!category) return {};

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://hollandsefacilitygroup.com';

  return {
    title: category.title,
    description: category.description,
    alternates: {
      canonical: `/products/${slug}`,
    },
    openGraph: {
      title: category.title,
      description: category.description,
      url: `${baseUrl}/products/${slug}`,
    },
  };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = serviceCategories[slug];

  if (!category) {
    notFound();
  }

  const SectionComponent = category.component;

  return (
    <>
      <SiteHeader />
      <ServicePageClient>
        <main className="page-main">
          <SectionComponent />
        </main>
      </ServicePageClient>
      <SiteFooter />
    </>
  );
}
