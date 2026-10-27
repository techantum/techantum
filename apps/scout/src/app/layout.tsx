import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';
import { getRevealeoSite } from '@/lib/cms/site';

export const dynamic = 'force-dynamic';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getRevealeoSite();
  return {
    title: branding.tagline ? `${branding.company_name} — ${branding.tagline}` : branding.company_name,
    description: branding.tagline || 'Turn public competitor data into comparisons, notes, and downloadable reports.',
    icons: branding.favicon_url ? { icon: branding.favicon_url } : undefined,
    openGraph: {
      title: branding.company_name,
      description: branding.tagline,
      images: branding.og_image_url ? [branding.og_image_url] : undefined,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable} scroll-pt-[72px]`}>
      <body>{children}</body>
    </html>
  );
}
