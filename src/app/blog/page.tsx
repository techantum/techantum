import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import BlogHero from './components/BlogHero';
import BlogGrid from './components/BlogGrid';

export default function BlogPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        <BlogHero />
        <BlogGrid />
      </main>
      <Footer />
    </>
  );
}
