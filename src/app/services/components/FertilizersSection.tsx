import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function FertilizersSection() {
  const products = [
  {
    id: 'fert_npk',
    name: 'NPK Fertilizer',
    description: 'Balanced nitrogen, phosphorus, and potassium for all crops',
    specifications: ['Various NPK Ratios', 'Water Soluble', 'Granular/Powder', 'Slow/Fast Release'],
    compositions: ['15-15-15', '20-10-10', '10-20-20', '12-12-17+2MgO'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f0b7e7b1-1771664592095.png",
    imageAlt: 'NPK fertilizer granules showing balanced nutrient composition for crops'
  },
  {
    id: 'fert_urea',
    name: 'Urea 46%',
    description: 'High nitrogen content fertilizer for rapid plant growth',
    specifications: ['46% Nitrogen', 'Prilled/Granular', 'High Purity', 'Agricultural Grade'],
    compositions: ['Nitrogen (N): 46%', 'Biuret: <1%', 'Moisture: <0.5%', 'Size: 2-4mm'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f2bba614-1771664592189.png",
    imageAlt: 'White urea fertilizer prills with 46% nitrogen content for agriculture'
  },
  {
    id: 'fert_dap',
    name: 'DAP (Diammonium Phosphate)',
    description: 'High phosphorus fertilizer for root development',
    specifications: ['18-46-0 Formula', 'Granular Form', 'Quick Dissolving', 'Soil Amendment'],
    compositions: ['Nitrogen (N): 18%', 'Phosphorus (P2O5): 46%', 'pH: 7.5-8.5', 'Size: 2-4mm'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1dfc3cbba-1766332567603.png",
    imageAlt: 'DAP fertilizer granules rich in phosphorus for root growth'
  },
  {
    id: 'fert_potash',
    name: 'Potash (MOP)',
    description: 'Muriate of potash for fruit and vegetable quality',
    specifications: ['60% K2O', 'Chloride Form', 'Granular/Standard', 'High Solubility'],
    compositions: ['Potassium (K2O): 60%', 'Chloride: 47%', 'Moisture: <1%', 'Size: 2-5mm'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_182b0af4e-1770939797635.png",
    imageAlt: 'Potash fertilizer granules for improving crop quality and yield'
  },
  {
    id: 'fert_organic',
    name: 'Organic Compost',
    description: 'Natural organic fertilizer for sustainable farming',
    specifications: ['100% Organic', 'Soil Conditioner', 'Microbial Rich', 'Slow Release'],
    compositions: ['Organic Matter: 40-60%', 'NPK: 2-1-1', 'pH: 6.5-7.5', 'Humus Content: High'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f81d4457-1764906618837.png",
    imageAlt: 'Dark organic compost fertilizer made from natural plant materials'
  },
  {
    id: 'fert_calcium',
    name: 'Calcium Nitrate',
    description: 'Water-soluble calcium and nitrogen fertilizer',
    specifications: ['15.5-0-0+19Ca', 'Fully Soluble', 'Greenhouse Grade', 'Prevents Blossom End Rot'],
    compositions: ['Nitrogen (N): 15.5%', 'Calcium (Ca): 19%', 'Nitrate Form', 'Water Soluble'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1899ed7e7-1770063017277.png",
    imageAlt: 'Calcium nitrate fertilizer crystals for preventing crop deficiencies'
  }];


  return (
    <section id="fertilizers" className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Icon name="BeakerIcon" size={24} className="text-accent" />
            </div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground">
              Fertilizers
            </h2>
          </div>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl">
            Agricultural-grade fertilizers for enhanced crop yield and soil health. Available in various formulations to meet specific farming needs.
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
                <div className="mb-4">
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
                className="w-full bg-accent text-accent-foreground px-4 py-2 rounded-lg font-inter font-medium text-sm hover:bg-accent/90 transition-colors inline-flex items-center justify-center gap-2">
                
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