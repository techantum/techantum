import Icon from '@/components/ui/AppIcon';

interface TestimonialGridProps {
  selectedCategory: string
  selectedCountry: string
}

export default function TestimonialGrid({ selectedCategory, selectedCountry }: TestimonialGridProps) {
  const testimonials = [
    {
      id: 'test_1',
      name: 'Marcus Schmidt',
      country: 'Germany',
      company: 'Schmidt Digital GmbH',
      rating: 5,
      date: '2024-01-15',
      service: 'Websites',
      text: 'TechAntum rebuilt our corporate website from scratch. The new site loads fast, looks professional, and our lead inquiries increased by 40% within the first month.',
    },
    {
      id: 'test_2',
      name: 'Isabella Rodrigues',
      country: 'Brazil',
      company: 'AgroTech Solutions',
      rating: 5,
      date: '2024-01-10',
      service: 'Web Applications',
      text: 'They developed a custom web application for our inventory management. The team was responsive, delivered on time, and the app has streamlined our entire operation.',
    },
    {
      id: 'test_3',
      name: 'Ahmed El-Mansouri',
      country: 'Morocco',
      company: 'Atlas Logistics',
      rating: 5,
      date: '2024-01-08',
      service: 'Mobile Applications',
      text: 'Our mobile app for delivery tracking was built flawlessly. TechAntum handled everything from UI design to App Store deployment. Highly recommended.',
    },
    {
      id: 'test_4',
      name: 'Sophie Dubois',
      country: 'Belgium',
      company: 'EcoHeat Solutions',
      rating: 5,
      date: '2024-01-05',
      service: 'Web Applications',
      text: 'We needed a SaaS dashboard for our clients and TechAntum delivered beyond expectations. Clean code, great UX, and excellent post-launch support.',
    },
    {
      id: 'test_5',
      name: 'Jennifer Williams',
      country: 'Canada',
      company: 'Williams Consulting',
      rating: 5,
      date: '2023-12-28',
      service: 'Websites',
      text: 'Our new portfolio website perfectly showcases our work. TechAntum understood our brand and delivered a site that has impressed every client who visits it.',
    },
    {
      id: 'test_6',
      name: 'Hans Müller',
      country: 'Germany',
      company: 'Müller FinTech',
      rating: 5,
      date: '2023-12-20',
      service: 'Web Applications',
      text: 'The admin dashboard they built handles thousands of transactions daily without a hitch. Professional team, clear communication, and solid engineering.',
    },
    {
      id: 'test_7',
      name: 'Maria Silva',
      country: 'Brazil',
      company: 'Silva E-commerce',
      rating: 5,
      date: '2023-12-15',
      service: 'Websites',
      text: 'Our e-commerce store was live in 5 weeks with full payment integration. Sales have doubled since launch. TechAntum made the entire process seamless.',
    },
    {
      id: 'test_8',
      name: 'Pierre Laurent',
      country: 'France',
      company: 'Laurent Health',
      rating: 5,
      date: '2023-12-10',
      service: 'Mobile Applications',
      text: 'The patient booking app they developed is intuitive and reliable. Our users love it and appointment no-shows dropped by 25%. Outstanding work.',
    },
    {
      id: 'test_9',
      name: 'Anna Kowalski',
      country: 'Netherlands',
      company: 'Dutch Startup Hub',
      rating: 5,
      date: '2023-11-28',
      service: 'Web Applications',
      text: 'TechAntum built our MVP in record time. The agile process meant we could iterate quickly based on user feedback. They truly feel like part of our team.',
    },
    {
      id: 'test_10',
      name: 'Michael Chen',
      country: 'United States',
      company: 'Chen Analytics',
      rating: 5,
      date: '2023-11-20',
      service: 'Web Applications',
      text: 'Complex data visualization dashboard delivered on time and under budget. The React/Next.js stack they chose was the perfect fit for our needs.',
    },
    {
      id: 'test_11',
      name: 'James Wilson',
      country: 'United Kingdom',
      company: 'Wilson Retail',
      rating: 5,
      date: '2023-11-10',
      service: 'Mobile Applications',
      text: 'Cross-platform app for iOS and Android launched simultaneously. One codebase, two platforms, half the cost. Smart approach and flawless execution.',
    },
    {
      id: 'test_12',
      name: 'Elena Popov',
      country: 'Germany',
      company: 'Popov Design Studio',
      rating: 5,
      date: '2023-10-28',
      service: 'Websites',
      text: 'Beautiful, minimalist website that loads in under 2 seconds. TechAntum nailed the design and performance optimization. Could not be happier.',
    },
  ]

  const filteredTestimonials = testimonials.filter((testimonial) => {
    const categoryMatch = selectedCategory === 'All' || testimonial.service === selectedCategory
    const countryMatch = selectedCountry === 'All' || testimonial.country === selectedCountry
    return categoryMatch && countryMatch
  })

  return (
    <section className="py-16 reveal">
      <div className="max-w-7xl mx-auto px-6">
        {filteredTestimonials.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-inter text-lg text-muted-foreground">
              No testimonials found for the selected filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal reveal-stagger">
              {filteredTestimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-card p-6 rounded-2xl shadow-sm border border-border hover-lift"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Icon key={i} name="StarIcon" size={20} className="text-accent" variant="solid" />
                    ))}
                  </div>

                  <p className="font-inter text-base text-foreground mb-6 leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>

                  <div className="pt-4 border-t border-border">
                    <p className="font-inter font-semibold text-sm text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="font-inter text-xs text-muted-foreground">
                      {testimonial.company}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-inter text-xs text-muted-foreground">
                        {testimonial.country}
                      </span>
                      <span className="font-inter text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {testimonial.service}
                      </span>
                    </div>
                    <p className="font-inter text-xs text-muted-foreground mt-2">
                      {new Date(testimonial.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="font-inter text-base text-muted-foreground mb-4">
                Showing {filteredTestimonials.length} of {testimonials.length} testimonials
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
