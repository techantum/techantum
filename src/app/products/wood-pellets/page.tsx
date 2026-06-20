import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export const metadata: Metadata = {
  title: 'ENplus Certified Wood Pellets - Premium Biomass Heating Fuel',
  description: 'High BTU ENplus certified wood pellets for heating and energy. Low ash content, sustainable biomass fuel. Bulk and bagged options available.',
  keywords: ['wood pellets', 'ENplus certified', 'biomass fuel', 'heating pellets', 'sustainable energy', 'wood pellet supplier', 'renewable energy'],
  openGraph: {
    title: 'ENplus Certified Wood Pellets | Holland SEFG BV',
    description: 'High BTU ENplus certified wood pellets for heating and energy. Sustainable biomass fuel.',
    images: ['/icon-512.png']
  }
};

export default function WoodPelletsPage() {
  const products = [
  {
    id: 'pellet_premium',
    name: 'Premium Grade A1',
    description: 'Top quality wood pellets for residential heating',
    specifications: ['ENplus A1 Certified', 'Low Ash Content', 'High BTU', 'Low Moisture'],
    technicalData: ['BTU: 8,200-8,500', 'Ash: <0.7%', 'Moisture: <8%', 'Diameter: 6-8mm'],
    price: '€280 - €380 per MT',
    image: "/assets/images/wood-pellets.jpg",
    imageAlt: 'Premium grade A1 wood pellets for efficient residential heating'
  },
  {
    id: 'pellet_industrial',
    name: 'Industrial Grade',
    description: 'Cost-effective pellets for commercial heating systems',
    specifications: ['EN Plus A2', 'Medium Ash', 'Bulk Available', 'Industrial Use'],
    technicalData: ['BTU: 7,800-8,200', 'Ash: <1.5%', 'Moisture: <10%', 'Diameter: 6-8mm'],
    price: '€220 - €320 per MT',
    image: "/assets/images/wood-pellets.jpg",
    imageAlt: 'Industrial grade wood pellets for commercial heating applications'
  },
  {
    id: 'pellet_softwood',
    name: 'Softwood Pellets',
    description: 'Pure softwood pellets with high energy output',
    specifications: ['100% Softwood', 'High Density', 'Consistent Quality', 'Clean Burning'],
    technicalData: ['BTU: 8,400-8,700', 'Ash: <0.5%', 'Moisture: <7%', 'Density: 650kg/m³'],
    price: '€290 - €390 per MT',
    image: "/assets/images/wood-pellets.jpg",
    imageAlt: 'Softwood pellets made from pine and spruce for high energy output'
  },
  {
    id: 'pellet_hardwood',
    name: 'Hardwood Pellets',
    description: 'Dense hardwood pellets for longer burn time',
    specifications: ['100% Hardwood', 'Long Burn Time', 'Low Emissions', 'Minimal Ash'],
    technicalData: ['BTU: 8,000-8,300', 'Ash: <1.0%', 'Moisture: <8%', 'Density: 700kg/m³'],
    price: '€300 - €400 per MT',
    image: "/assets/images/wood-pellets.jpg",
    imageAlt: 'Hardwood pellets from oak and beech for extended burning duration'
  }];


  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeftIcon" size={20} />
            </Link>
            <nav className="font-inter text-sm text-muted-foreground">
              <Link href="/products" className="hover:text-foreground">Products</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Wood Pellets</span>
            </nav>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon name="FireIcon" size={32} className="text-primary" />
            </div>
            <h1 className="font-bricolage text-5xl md:text-6xl font-bold text-foreground">
              Wood Pellets
            </h1>
          </div>
          
          <p className="font-inter text-xl text-muted-foreground max-w-3xl">
            Sustainable biomass heating solutions with high energy efficiency. ENplus certified pellets for residential and industrial applications.
          </p>
        </div>
      </section>
      {/* Products Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                      Standards
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

                  {/* Technical Data */}
                  <div className="mb-6">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Technical Data
                    </p>
                    <ul className="space-y-1">
                      {product?.technicalData?.map((data, idx) =>
                    <li key={idx} className="font-inter text-xs text-muted-foreground">
                          • {data}
                        </li>
                    )}
                    </ul>
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