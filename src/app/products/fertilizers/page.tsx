import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export const metadata: Metadata = {
  title: 'Agricultural Fertilizers - NPK, Urea, DAP & Organic Fertilizers',
  description: 'Premium agricultural fertilizers for optimal crop growth. NPK fertilizer, urea, DAP, and organic options. Certified composition analysis for all products.',
  keywords: ['fertilizer supplier', 'NPK fertilizer', 'urea fertilizer', 'DAP fertilizer', 'organic fertilizer', 'agricultural fertilizer', 'crop nutrition', 'wholesale fertilizer'],
  openGraph: {
    title: 'Agricultural Fertilizers | Holland SEFG BV',
    description: 'Premium fertilizers for optimal crop growth. NPK, urea, DAP, and organic options available.',
    images: ['/icon-512.png']
  }
};

export default function FertilizersPage() {
  const products = [
  {
    id: 'fert_npk',
    name: 'NPK Fertilizer',
    description: 'Balanced nitrogen, phosphorus, and potassium for all crops',
    specifications: ['Various NPK Ratios', 'Water Soluble', 'Granular/Powder', 'Slow/Fast Release'],
    compositions: ['15-15-15', '20-10-10', '10-20-20', '12-12-17+2MgO'],
    price: '€350 - €550 per MT',
    image: "/assets/images/fertilizers.jpg",
    imageAlt: 'NPK fertilizer granules showing balanced nutrient composition for crops'
  },
  {
    id: 'fert_urea',
    name: 'Urea 46%',
    description: 'High nitrogen content fertilizer for rapid plant growth',
    specifications: ['46% Nitrogen', 'Prilled/Granular', 'High Purity', 'Agricultural Grade'],
    compositions: ['Nitrogen (N): 46%', 'Biuret: <1%', 'Moisture: <0.5%', 'Size: 2-4mm'],
    price: '€300 - €500 per MT',
    image: "/assets/images/fertilizers.jpg",
    imageAlt: 'White urea fertilizer prills with 46% nitrogen content for agriculture'
  },
  {
    id: 'fert_dap',
    name: 'DAP (Diammonium Phosphate)',
    description: 'High phosphorus fertilizer for root development',
    specifications: ['18-46-0 Formula', 'Granular Form', 'Quick Dissolving', 'Soil Amendment'],
    compositions: ['Nitrogen (N): 18%', 'Phosphorus (P2O5): 46%', 'pH: 7.5-8.5', 'Size: 2-4mm'],
    price: '€400 - €600 per MT',
    image: "/assets/images/fertilizers.jpg",
    imageAlt: 'DAP fertilizer granules rich in phosphorus for root growth'
  },
  {
    id: 'fert_potash',
    name: 'Potash (MOP)',
    description: 'Muriate of potash for fruit and vegetable quality',
    specifications: ['60% K2O', 'Chloride Form', 'Granular/Standard', 'High Solubility'],
    compositions: ['Potassium (K2O): 60%', 'Chloride: 47%', 'Moisture: <1%', 'Size: 2-5mm'],
    price: '€380 - €580 per MT',
    image: "/assets/images/fertilizers.jpg",
    imageAlt: 'Potash fertilizer granules for improving crop quality and yield'
  },
  {
    id: 'fert_organic',
    name: 'Organic Compost',
    description: 'Natural organic fertilizer for sustainable farming',
    specifications: ['100% Organic', 'Soil Conditioner', 'Microbial Rich', 'Slow Release'],
    compositions: ['Organic Matter: 40-60%', 'NPK: 2-1-1', 'pH: 6.5-7.5', 'Humus Content: High'],
    price: '€250 - €450 per MT',
    image: "/assets/images/fertilizers.jpg",
    imageAlt: 'Dark organic compost fertilizer made from natural plant materials'
  },
  {
    id: 'fert_calcium',
    name: 'Calcium Nitrate',
    description: 'Water-soluble calcium and nitrogen fertilizer',
    specifications: ['15.5-0-0+19Ca', 'Fully Soluble', 'Greenhouse Grade', 'Prevents Blossom End Rot'],
    compositions: ['Nitrogen (N): 15.5%', 'Calcium (Ca): 19%', 'Nitrate Form', 'Water Soluble'],
    price: '€450 - €650 per MT',
    image: "/assets/images/fertilizers.jpg",
    imageAlt: 'Calcium nitrate fertilizer crystals for preventing crop deficiencies'
  }];


  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-accent/10 via-background to-primary/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeftIcon" size={20} />
            </Link>
            <nav className="font-inter text-sm text-muted-foreground">
              <Link href="/products" className="hover:text-foreground">Products</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Fertilizers</span>
            </nav>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Icon name="BeakerIcon" size={32} className="text-accent" />
            </div>
            <h1 className="font-bricolage text-5xl md:text-6xl font-bold text-foreground">
              Fertilizers
            </h1>
          </div>
          
          <p className="font-inter text-xl text-muted-foreground max-w-3xl">
            Agricultural-grade fertilizers for enhanced crop yield and soil health. Available in various formulations to meet specific farming needs.
          </p>
        </div>
      </section>
      {/* Products Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products?.map((product) =>
            <div
              key={product?.id}
              className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover-lift">
              
                <div className="relative h-64 overflow-hidden">
                  <AppImage
                  src={product?.image}
                  alt={product?.imageAlt}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover" />
                
                </div>
                
                <div className="p-6">
                  <h3 className="font-bricolage text-2xl font-semibold text-foreground mb-3">
                    {product?.name}
                  </h3>
                  
                  <p className="font-inter text-sm text-muted-foreground mb-4">
                    {product?.description}
                  </p>

                  {/* Price */}
                  <div className="mb-4 p-3 bg-accent/5 rounded-lg">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Price Range
                    </p>
                    <p className="font-bricolage text-lg font-bold text-accent">
                      {product?.price}
                    </p>
                  </div>

                  {/* Specifications */}
                  <div className="mb-4">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Product Features
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product?.specifications?.map((spec, idx) =>
                    <span
                      key={idx}
                      className="font-inter text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                      
                          {spec}
                        </span>
                    )}
                    </div>
                  </div>

                  {/* Compositions */}
                  <div className="mb-6">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Composition
                    </p>
                    <ul className="space-y-1">
                      {product?.compositions?.map((comp, idx) =>
                    <li key={idx} className="font-inter text-xs text-muted-foreground">
                          • {comp}
                        </li>
                    )}
                    </ul>
                  </div>

                  <Link
                  href="/contact"
                  className="w-full bg-accent text-accent-foreground px-4 py-3 rounded-lg font-inter font-medium text-sm hover:bg-accent/90 transition-colors inline-flex items-center justify-center gap-2">
                  
                    Request Quote
                    <Icon name="ArrowRightIcon" size={16} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>);

}