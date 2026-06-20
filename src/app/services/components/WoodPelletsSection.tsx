import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function WoodPelletsSection() {
  const products = [
  {
    id: 'pellet_premium',
    name: 'Premium Grade A1',
    description: 'Top quality wood pellets for residential heating',
    specifications: ['ENplus A1 Certified', 'Low Ash Content', 'High BTU', 'Low Moisture'],
    technicalData: ['BTU: 8,200-8,500', 'Ash: <0.7%', 'Moisture: <8%', 'Diameter: 6-8mm'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1328889fa-1771073801857.png",
    imageAlt: 'Premium grade A1 wood pellets for efficient residential heating'
  },
  {
    id: 'pellet_industrial',
    name: 'Industrial Grade',
    description: 'Cost-effective pellets for commercial heating systems',
    specifications: ['EN Plus A2', 'Medium Ash', 'Bulk Available', 'Industrial Use'],
    technicalData: ['BTU: 7,800-8,200', 'Ash: <1.5%', 'Moisture: <10%', 'Diameter: 6-8mm'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c3515485-1770939795052.png",
    imageAlt: 'Industrial grade wood pellets for commercial heating applications'
  },
  {
    id: 'pellet_softwood',
    name: 'Softwood Pellets',
    description: 'Pure softwood pellets with high energy output',
    specifications: ['100% Softwood', 'High Density', 'Consistent Quality', 'Clean Burning'],
    technicalData: ['BTU: 8,400-8,700', 'Ash: <0.5%', 'Moisture: <7%', 'Density: 650kg/m³'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1b238d007-1771078302931.png",
    imageAlt: 'Softwood pellets made from pine and spruce for high energy output'
  },
  {
    id: 'pellet_hardwood',
    name: 'Hardwood Pellets',
    description: 'Dense hardwood pellets for longer burn time',
    specifications: ['100% Hardwood', 'Long Burn Time', 'Low Emissions', 'Minimal Ash'],
    technicalData: ['BTU: 8,000-8,300', 'Ash: <1.0%', 'Moisture: <8%', 'Density: 700kg/m³'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1ee1ef628-1771073801066.png",
    imageAlt: 'Hardwood pellets from oak and beech for extended burning duration'
  }];


  return (
    <section id="wood-pellets" className="py-16 bg-muted reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="FireIcon" size={24} className="text-primary" />
            </div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground">
              Wood Pellets
            </h2>
          </div>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl">
            Sustainable biomass heating solutions with high energy efficiency. ENplus certified pellets for residential and industrial applications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="mb-4">
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
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-inter font-medium text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2">
                
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