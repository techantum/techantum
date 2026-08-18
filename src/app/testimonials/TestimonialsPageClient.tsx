'use client';

import { useState } from 'react';
import TestimonialFilters from './components/TestimonialFilters';
import TestimonialGrid from './components/TestimonialGrid';
import type { TestimonialItem } from '@/lib/testimonials-data';

export default function TestimonialsPageClient({
  testimonials,
}: {
  testimonials: TestimonialItem[];
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <>
      <TestimonialFilters
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      <TestimonialGrid testimonials={testimonials} selectedCategory={selectedCategory} />
    </>
  );
}
