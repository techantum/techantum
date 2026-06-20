'use client';
import { useState } from 'react';

import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import TestimonialsHero from './components/TestimonialsHero';
import TestimonialFilters from './components/TestimonialFilters';
import TestimonialGrid from './components/TestimonialGrid';

export default function TestimonialsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        <TestimonialsHero />
        <TestimonialFilters
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
        />
        <TestimonialGrid
          selectedCategory={selectedCategory}
          selectedCountry={selectedCountry}
        />
      </main>
      <Footer />
    </>
  );
}
