import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function ProductCategoriesSection() {
  const categories = [
  {
    id: 'cat_oil',
    name: 'Cooking Oils',
    description: 'Premium quality sunflower, palm, soybean, and olive oils',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a223b109-1767901736407.png",
    imageAlt: 'Various bottles of cooking oil including sunflower and olive oil on wooden table',
    href: '/products#cooking-oils'
  },
  {
    id: 'cat_feed',
    name: 'Chicken Feed',
    description: 'Nutritious starter, grower, layer, and broiler feed',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1295dfa1c-1768460181383.png",
    imageAlt: 'Bags of chicken feed pellets and grains for poultry farming',
    href: '/products#chicken-feed'
  },
  {
    id: 'cat_fert',
    name: 'Fertilizers',
    description: 'NPK, urea, DAP, and organic fertilizers for optimal growth',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1dfa1ad2c-1766488123513.png",
    imageAlt: 'Agricultural fertilizer pellets and organic compost for soil enrichment',
    href: '/products#fertilizers'
  },
  {
    id: 'cat_pellets',
    name: 'Wood Pellets',
    description: 'High BTU wood pellets for heating and energy',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_134b1ef9e-1764865974487.png",
    imageAlt: 'Wood pellets for biomass heating and sustainable energy production',
    href: '/products#wood-pellets'
  },
  {
    id: 'cat_scrap',
    name: 'Iron Scraps',
    description: 'HMS 1&2, shredded, and cast iron scrap materials',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a84b39e3-1766757224930.png",
    imageAlt: 'Industrial iron scrap metal pieces ready for recycling and processing',
    href: '/products#iron-scraps'
  }];


  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-inter text-sm uppercase tracking-wider text-primary font-medium mb-3 block">
            Our Products
          </span>
          <h2 className="font-bricolage text-4xl md:text-5xl font-bold text-foreground mb-4">
            Quality Supply Solutions
          </h2>
          <p className="font-inter text-lg text-muted-foreground max-w-2xl mx-auto">
            From cooking oils to industrial materials, we supply a comprehensive range of quality products for businesses worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories?.map((category) =>
          <Link
            key={category?.id}
            href={category?.href}
            className="group bg-card rounded-2xl overflow-hidden shadow-sm hover-lift border border-border">
            
              <div className="relative h-64 overflow-hidden">
                <AppImage
                src={category?.image}
                alt={category?.imageAlt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-bricolage text-2xl font-bold text-white mb-1">
                    {category?.name}
                  </h3>
                  <p className="font-inter text-sm text-white/90">
                    {category?.description}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="font-inter text-sm font-medium text-primary">
                    View Products
                  </span>
                  <Icon
                  name="ArrowRightIcon"
                  size={20}
                  className="text-primary group-hover:translate-x-1 transition-transform" />
                
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>);


}