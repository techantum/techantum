import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function ChickenFeedSection() {
  const products = [
  {
    id: 'feed_starter',
    name: 'Starter Feed',
    description: 'High-protein feed for chicks 0-6 weeks old',
    specifications: ['20-22% Protein', 'Crumbled Texture', 'Vitamin Enriched', 'Coccidiostat Added'],
    nutritionalInfo: ['Crude Protein: 20-22%', 'Fat: 3-5%', 'Fiber: 4-6%', 'Calcium: 0.9-1.2%'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1afbe3e09-1770939795069.png",
    imageAlt: 'Bag of starter chicken feed pellets with nutritional information label'
  },
  {
    id: 'feed_grower',
    name: 'Grower Feed',
    description: 'Balanced nutrition for growing chickens 6-20 weeks',
    specifications: ['16-18% Protein', 'Pelleted Form', 'Energy Optimized', 'Mineral Balanced'],
    nutritionalInfo: ['Crude Protein: 16-18%', 'Fat: 3-4%', 'Fiber: 5-7%', 'Calcium: 0.8-1.0%'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_12ee893ab-1767018548460.png",
    imageAlt: 'Grower chicken feed pellets in storage container for poultry farm'
  },
  {
    id: 'feed_layer',
    name: 'Layer Feed',
    description: 'Calcium-rich feed for egg-laying hens',
    specifications: ['16-17% Protein', 'High Calcium', 'Shell Strengthening', 'Omega-3 Enhanced'],
    nutritionalInfo: ['Crude Protein: 16-17%', 'Fat: 3-4%', 'Fiber: 4-6%', 'Calcium: 3.5-4.5%'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_10b8c9c0a-1768460179722.png",
    imageAlt: 'Layer chicken feed with high calcium content for egg production'
  },
  {
    id: 'feed_broiler',
    name: 'Broiler Feed',
    description: 'High-energy feed for meat production chickens',
    specifications: ['19-23% Protein', 'Fast Growth Formula', 'High Energy', 'Amino Acid Balanced'],
    nutritionalInfo: ['Crude Protein: 19-23%', 'Fat: 4-6%', 'Fiber: 3-5%', 'Calcium: 0.9-1.1%'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f62f66d5-1771078300588.png",
    imageAlt: 'Broiler chicken feed pellets optimized for meat production'
  },
  {
    id: 'feed_organic',
    name: 'Organic Feed',
    description: 'Certified organic feed for free-range chickens',
    specifications: ['Organic Certified', 'Non-GMO', 'No Antibiotics', 'Natural Ingredients'],
    nutritionalInfo: ['Crude Protein: 16-18%', 'Fat: 3-5%', 'Fiber: 5-7%', 'Calcium: 1.0-1.5%'],
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1ff76e759-1765252172076.png",
    imageAlt: 'Organic chicken feed made from natural grains for free-range poultry'
  }];


  return (
    <section id="chicken-feed" className="page-section bg-muted reveal">
      <div className="page-container">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Icon name="SparklesIcon" size={24} className="text-secondary" />
            </div>
            <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground">
              Chicken Feed
            </h2>
          </div>
          <p className="font-inter text-lg text-muted-foreground max-w-3xl">
            Complete nutrition solutions for all stages of poultry growth. Formulated by animal nutrition experts for optimal health and productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    Key Features
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

                {/* Nutritional Info */}
                <div className="mb-4">
                  <p className="font-inter text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    Nutritional Analysis
                  </p>
                  <ul className="space-y-1">
                    {product?.nutritionalInfo?.map((info, idx) =>
                  <li key={idx} className="font-inter text-xs text-muted-foreground">
                        • {info}
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