import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function IronScrapsSection() {
  const products = [
  {
    id: 'scrap_hms1',
    name: 'HMS 1 (Heavy Melting Steel)',
    description: 'Prime quality heavy melting steel scrap for steel mills',
    specifications: ['Grade: HMS 1', 'Min Thickness: 6mm', 'Max Length: 1.5m', 'Low Contamination'],
    grades: ['Carbon: 0.5-0.8%', 'Sulfur: <0.05%', 'Phosphorus: <0.05%', 'Density: 1.2-1.6 t/m³'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1956b083d-1770939797813.png",
    imageAlt: 'HMS 1 heavy melting steel scrap pieces for industrial recycling'
  },
  {
    id: 'scrap_hms2',
    name: 'HMS 2 (Light Melting Steel)',
    description: 'Light melting steel scrap for general steel production',
    specifications: ['Grade: HMS 2', 'Min Thickness: 3mm', 'Mixed Sizes', 'Industrial Grade'],
    grades: ['Carbon: 0.3-0.6%', 'Sulfur: <0.06%', 'Phosphorus: <0.06%', 'Density: 0.8-1.2 t/m³'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1956b083d-1770939797813.png",
    imageAlt: 'HMS 2 light melting steel scrap for general steel manufacturing'
  },
  {
    id: 'scrap_shredded',
    name: 'Shredded Steel Scrap',
    description: 'Pre-processed shredded scrap ready for furnace charging',
    specifications: ['Shredded/Fragmented', 'Clean Grade', 'Free of Contaminants', 'Easy Handling'],
    grades: ['Size: <200mm', 'Density: 0.6-1.0 t/m³', 'Moisture: <3%', 'Non-ferrous: <2%'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_10144ce00-1771073801500.png",
    imageAlt: 'Shredded steel scrap fragments ready for furnace charging'
  },
  {
    id: 'scrap_cast',
    name: 'Cast Iron Scrap',
    description: 'High-grade cast iron scrap for foundries',
    specifications: ['Cast Iron Grade', 'Low Alloy', 'Foundry Quality', 'Sorted & Cleaned'],
    grades: ['Carbon: 2.5-4.0%', 'Silicon: 1-3%', 'Manganese: 0.5-1%', 'Density: 7.0-7.2 t/m³'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a6d7a5d3-1770939792357.png",
    imageAlt: 'Cast iron scrap pieces for foundry and manufacturing use'
  },
  {
    id: 'scrap_stainless',
    name: 'Stainless Steel Scrap',
    description: 'Premium stainless steel scrap (304, 316 grades)',
    specifications: ['304/316 Grades', 'Sorted by Grade', 'Low Carbon', 'High Purity'],
    grades: ['Chromium: 18-20%', 'Nickel: 8-10%', 'Carbon: <0.08%', 'Density: 7.9 t/m³'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_177f01b2a-1771073805185.png",
    imageAlt: 'Stainless steel scrap 304 and 316 grades for premium recycling'
  }];


  return (
    <section id="iron-scraps" className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Icon name="WrenchScrewdriverIcon" size={24} className="text-secondary" />
            </div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground">
              Iron Scraps
            </h2>
          </div>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl">
            Quality ferrous scrap metal for steel mills, foundries, and recycling facilities. All materials inspected and certified for composition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product) =>
          <div
            key={product?.id}
            className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover-lift">
            
              <div className="relative h-48 overflow-hidden">
                <AppImage
                src={product?.image}
                alt={product?.imageAlt}
                className="w-full h-full object-cover" />
              
              </div>
              <div className="p-6">
                <h3 className="font-bricolage text-xl font-semibold text-foreground mb-2">
                  {product?.name}
                </h3>
                <p className="font-inter text-sm text-muted-foreground mb-4">
                  {product?.description}
                </p>

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
                <div className="mb-4">
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
                className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-inter font-medium text-sm hover:bg-secondary/90 transition-colors inline-flex items-center justify-center gap-2">
                
                  Request Quote
                  <Icon name="ArrowRightIcon" size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);


}