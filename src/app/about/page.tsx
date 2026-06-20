import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import AboutHero from './components/AboutHero';
import MissionSection from './components/MissionSection';
import TimelineSection from './components/TimelineSection';
import ValuesSection from './components/ValuesSection';
import PartnerCountriesGrid from './components/PartnerCountriesGrid';
import CertificationsSection from './components/CertificationsSection';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        <AboutHero />
        <MissionSection />
        <TimelineSection />
        <ValuesSection />
        <PartnerCountriesGrid />
        <CertificationsSection />
      </main>
      <Footer />
    </>
  );
}
