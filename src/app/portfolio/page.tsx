import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import PortfolioHero from './components/PortfolioHero';
import IndustriesSection from './components/IndustriesSection';
import FeaturedProjectsSection from './components/FeaturedProjectsSection';
import IndustryProjectsSection from './components/IndustryProjectsSection';
import PortfolioCTA from './components/PortfolioCTA';

export default function PortfolioPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        <PortfolioHero />
        <IndustriesSection />
        <FeaturedProjectsSection />
        <IndustryProjectsSection />
        <PortfolioCTA />
      </main>
      <Footer />
    </>
  );
}
