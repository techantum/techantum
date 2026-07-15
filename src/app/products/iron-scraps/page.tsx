import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export const metadata: Metadata = {
  title: 'Iron Scrap Metal - HMS 1&2, Shredded & Cast Iron Scrap',
  description: 'Quality iron scrap metal for recycling and manufacturing. HMS 1&2, shredded scrap, cast iron, and stainless steel scrap. Certified composition analysis.',
  keywords: ['iron scrap', 'metal scrap', 'HMS 1&2', 'shredded scrap', 'cast iron scrap', 'stainless steel scrap', 'scrap metal supplier', 'recycling metal'],
  openGraph: {
    title: 'Iron Scrap Metal | Holland SEFG BV',
    description: 'Quality iron scrap for recycling. HMS 1&2, shredded, cast iron, and stainless steel scrap.',
    images: ['/icon-512.png']
  }
};

export default function IronScrapsPage() {
  const products = [
  {
    id: 'scrap_hms1',
    name: 'HMS 1 (Heavy Melting Steel)',
    description: 'Prime quality heavy melting steel scrap for steel mills',
    specifications: ['Grade: HMS 1', 'Min Thickness: 6mm', 'Max Length: 1.5m', 'Low Contamination'],
    grades: ['Carbon: 0.5-0.8%', 'Sulfur: <0.05%', 'Phosphorus: <0.05%', 'Density: 1.2-1.6 t/m³'],
    price: '€280 - €420 per MT',
    image: "/assets/images/iron-scraps.jpg",
    imageAlt: 'HMS 1 heavy melting steel scrap pieces for industrial recycling'
  },
  {
    id: 'scrap_hms2',
    name: 'HMS 2 (Light Melting Steel)',
    description: 'Light melting steel scrap for general steel production',
    specifications: ['Grade: HMS 2', 'Min Thickness: 3mm', 'Mixed Sizes', 'Industrial Grade'],
    grades: ['Carbon: 0.3-0.6%', 'Sulfur: <0.06%', 'Phosphorus: <0.06%', 'Density: 0.8-1.2 t/m³'],
    price: '€250 - €380 per MT',
    image: "/assets/images/iron-scraps.jpg",
    imageAlt: 'HMS 2 light melting steel scrap for general steel manufacturing'
  },
  {
    id: 'scrap_shredded',
    name: 'Shredded Steel Scrap',
    description: 'Pre-processed shredded scrap ready for furnace charging',
    specifications: ['Shredded/Fragmented', 'Clean Grade', 'Free of Contaminants', 'Easy Handling'],
    grades: ['Size: <200mm', 'Density: 0.6-1.0 t/m³', 'Moisture: <3%', 'Non-ferrous: <2%'],
    price: '€220 - €350 per MT',
    image: "/assets/images/iron-scraps.jpg",
    imageAlt: 'Shredded steel scrap fragments ready for furnace charging'
  },
  {
    id: 'scrap_cast',
    name: 'Cast Iron Scrap',
    description: 'High-grade cast iron scrap for foundries',
    specifications: ['Cast Iron Grade', 'Low Alloy', 'Foundry Quality', 'Sorted & Cleaned'],
    grades: ['Carbon: 2.5-4.0%', 'Silicon: 1-3%', 'Manganese: 0.5-1%', 'Density: 7.0-7.2 t/m³'],
    price: '€200 - €320 per MT',
    image: "/assets/images/iron-scraps.jpg",
    imageAlt: 'Cast iron scrap pieces for foundry and manufacturing use'
  },
  {
    id: 'scrap_stainless',
    name: 'Stainless Steel Scrap',
    description: 'Premium stainless steel scrap (304, 316 grades)',
    specifications: ['304/316 Grades', 'Sorted by Grade', 'Low Carbon', 'High Purity'],
    grades: ['Chromium: 18-20%', 'Nickel: 8-10%', 'Carbon: <0.08%', 'Density: 7.9 t/m³'],
    price: '€1,200 - €1,800 per MT',
    image: "/assets/images/iron-scraps.jpg",
    imageAlt: 'Stainless steel scrap 304 and 316 grades for premium recycling'
  }];


  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-secondary/10 via-background to-accent/10 pt-28 pb-12 md:pt-32 md:pb-20">
        <div className="page-container">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeftIcon" size={20} />
            </Link>
            <nav className="font-inter text-sm text-muted-foreground">
              <Link href="/products" className="hover:text-foreground">Products</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Iron Scraps</span>
            </nav>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
              <Icon name="WrenchScrewdriverIcon" size={32} className="text-secondary" />
            </div>
            <h1 className="font-bricolage text-5xl md:text-6xl font-bold text-foreground">
              Iron Scraps
            </h1>
          </div>
          
          <p className="font-inter text-xl text-muted-foreground max-w-3xl">
            Quality ferrous scrap metal for steel mills, foundries, and recycling facilities. All materials inspected and certified for composition.
          </p>
        </div>
      </section>
      {/* Products Grid */}
      <section className="page-section">
        <div className="page-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  <div className="mb-4 p-3 bg-secondary/5 rounded-lg">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Price Range
                    </p>
                    <p className="font-bricolage text-lg font-bold text-secondary">
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
                      className="font-inter text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">
                      
                          {spec}
                        </span>
                    )}
                    </div>
                  </div>

                  {/* Grades */}
                  <div className="mb-6">
                    <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Composition
                    </p>
                    <ul className="space-y-1">
                      {product?.grades?.map((grade, idx) =>
                    <li key={idx} className="font-inter text-xs text-muted-foreground">
                          • {grade}
                        </li>
                    )}
                    </ul>
                  </div>

                  <Link
                  href="/contact"
                  className="w-full bg-secondary text-secondary-foreground px-4 py-3 rounded-lg font-inter font-medium text-sm hover:bg-secondary/90 transition-colors inline-flex items-center justify-center gap-2">
                  
                    Request Quote
                    <Icon name="ArrowRightIcon" size={16} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>);

}