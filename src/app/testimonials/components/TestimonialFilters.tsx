'use client';
interface TestimonialFiltersProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  selectedCountry: string
  setSelectedCountry: (country: string) => void
}

export default function TestimonialFilters({
  selectedCategory,
  setSelectedCategory,
  selectedCountry,
  setSelectedCountry,
}: TestimonialFiltersProps) {
  const categories = ['All', 'Websites', 'Web Applications', 'Mobile Applications']
  const countries = ['All', 'Germany', 'Brazil', 'Morocco', 'Belgium', 'Canada', 'Netherlands', 'France', 'United Kingdom', 'United States']

  return (
    <section className="py-8 bg-muted reveal">
      <div className="page-container">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
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

          <div className="w-full md:w-64">
            <label htmlFor="country-filter" className="font-inter text-sm font-medium text-foreground mb-2 block">
              Filter by Country
            </label>
            <select
              id="country-filter"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground font-inter text-sm focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            >
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  )
}
