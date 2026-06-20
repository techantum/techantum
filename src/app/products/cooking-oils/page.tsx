import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export const metadata: Metadata = {
  title: 'Premium Cooking Oils - Sunflower, Palm, Soybean & Olive Oil',
  description: 'High-quality refined cooking oils for food industry and wholesale. Sunflower oil, palm oil, soybean oil, and olive oil. ISO certified, bulk and retail packaging available.',
  keywords: ['cooking oil supplier', 'sunflower oil', 'palm oil', 'soybean oil', 'olive oil', 'refined oil', 'wholesale cooking oil', 'food grade oil'],
  openGraph: {
    title: 'Premium Cooking Oils | Holland SEFG BV',
    description: 'High-quality refined cooking oils for food industry and wholesale. ISO certified products.',
    images: ['/logo.jpg']
  }
};

export default function CookingOilsPage() {
  const products = [
  {
    id: 'oil_sunflower',
    name: 'Sunflower Oil',
    description: 'Refined, high oleic sunflower oil for cooking and food production',
    specifications: ['Refined', 'High Oleic', 'Light Color', 'Neutral Taste'],
    packaging: ['1L Bottles', '5L Jerry Cans', '25L Drums', 'Bulk Tankers'],
    price: '€1,200 - €1,800 per MT',
    image: "https://images.unsplash.com/photo-1662058595162-10e024b1a907",
    imageAlt: 'Clear bottle of refined sunflower oil with golden color on kitchen counter'
  },
  {
    id: 'oil_palm',
    name: 'Palm Oil',
    description: 'Sustainable palm oil for food processing and industrial use',
    specifications: ['Refined/Crude', 'RBD Quality', 'Low FFA', 'RSPO Certified'],
    packaging: ['25L Drums', 'Flexitanks', 'Bulk Shipment'],
    price: '€900 - €1,400 per MT',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f6d3115a-1765011342677.png",
    imageAlt: 'Red palm oil in glass container showing natural orange color'
  },
  {
    id: 'oil_soybean',
    name: 'Soybean Oil',
    description: 'Pure soybean oil for cooking, frying, and food manufacturing',
    specifications: ['Refined', 'Degummed', 'Winterized', 'Non-GMO Available'],
    packaging: ['1L-5L Bottles', '25L Drums', 'Bulk Tankers'],
    price: '€1,100 - €1,600 per MT',
    image: "https://images.unsplash.com/photo-1574785289548-b6604d39125d",
    imageAlt: 'Soybean oil bottle with soybeans scattered around on wooden surface'
  },
  {
    id: 'oil_canola',
    name: 'Canola Oil',
    description: 'Low saturated fat canola oil for health-conscious cooking',
    specifications: ['Refined', 'Low Saturated Fat', 'High Smoke Point', 'Omega-3 Rich'],
    packaging: ['1L-5L Bottles', '20L Jerry Cans', 'Bulk Options'],
    price: '€1,300 - €1,900 per MT',
    image: "https://images.unsplash.com/photo-1632381696887-1a82f49c289d",
    imageAlt: 'Canola oil bottle with yellow canola flowers in background'
  },
  {
    id: 'oil_olive',
    name: 'Olive Oil',
    description: 'Extra virgin and refined olive oil for premium markets',
    specifications: ['Extra Virgin', 'Refined', 'Cold Pressed', 'Low Acidity'],
    packaging: ['500ml-5L Bottles', 'Gift Sets', 'Bulk Drums'],
    price: '€2,500 - €4,500 per MT',
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
    imageAlt: 'Green glass bottle of extra virgin olive oil with olive branch'
  },
  {
    id: 'oil_coconut',
    name: 'Coconut Oil',
    description: 'Virgin and refined coconut oil for cooking and cosmetics',
    specifications: ['Virgin/Refined', 'Cold Pressed', 'Organic Options', 'RBD Available'],
    packaging: ['250ml-5L Jars', '25L Drums', 'Bulk Shipment'],
    price: '€1,800 - €2,800 per MT',
    image: "https://images.unsplash.com/photo-1596663094431-5faf4e2d77e4",
    imageAlt: 'Jar of white coconut oil with coconut halves on tropical background'
  }];


  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/services" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeftIcon" size={20} />
            </Link>
            <nav className="font-inter text-sm text-muted-foreground">
              <Link href="/services" className="hover:text-foreground">Services</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Cooking Oils</span>
            </nav>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon name="BeakerIcon" size={32} className="text-primary" />
            </div>
            <h1 className="font-bricolage text-5xl md:text-6xl font-bold text-foreground">
              Cooking Oils
            </h1>
          </div>
          
          <p className="font-inter text-xl text-muted-foreground max-w-3xl">
            Premium quality cooking oils for food service, manufacturing, and retail distribution. All products meet international food safety standards and are available in various packaging options.
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
                  <div className="mb-4 p-3 bg-primary/5 rounded-lg">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Price Range
                    </p>
                    <p className="font-bricolage text-lg font-bold text-primary">
                      {product?.price}
                    </p>
                  </div>

                  {/* Specifications */}
                  <div className="mb-4">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Specifications
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product?.specifications?.map((spec, idx) =>
                    <span
                      key={idx}
                      className="font-inter text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                      
                          {spec}
                        </span>
                    )}
                    </div>
                  </div>

                  {/* Packaging */}
                  <div className="mb-6">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Packaging Options
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product?.packaging?.map((pkg, idx) =>
                    <span
                      key={idx}
                      className="font-inter text-xs border border-border text-foreground px-2 py-1 rounded">
                      
                          {pkg}
                        </span>
                    )}
                    </div>
                  </div>

                  <Link
                  href="/contact"
                  className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-inter font-medium text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2">
                  
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