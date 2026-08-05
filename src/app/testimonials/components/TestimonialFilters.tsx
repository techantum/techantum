'use client';

interface TestimonialFiltersProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export default function TestimonialFilters({
  selectedCategory,
  setSelectedCategory,
}: TestimonialFiltersProps) {
  const categories = ['All', 'Websites', 'Web Applications', 'Mobile Applications'];

  return (
    <section className="py-8 bg-muted reveal">
      <div className="page-container">
        <label className="font-inter text-sm font-medium text-foreground mb-2 block">
          Filter by Service
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-inter text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-card/80 border border-border'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
