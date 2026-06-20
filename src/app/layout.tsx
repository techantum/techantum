import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import ScrollRevealProvider from '@/components/common/ScrollRevealProvider';
import WhatsAppWidget from '@/components/common/WhatsAppWidget';
import '../styles/index.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com'),
  title: {
    default: 'TechAntum | Websites, Web Apps & Mobile App Development',
    template: '%s | TechAntum',
  },
  description:
    'TechAntum is an IT company specializing in website development, custom web applications, and mobile app development. We build digital products that help businesses grow.',
  keywords: [
    'web development',
    'website development',
    'web application development',
    'mobile app development',
    'React development',
    'Next.js development',
    'TechAntum',
    'software development company',
    'custom software',
  ],
  authors: [{ name: 'TechAntum' }],
  creator: 'TechAntum',
  publisher: 'TechAntum',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'TechAntum',
    title: 'TechAntum | Websites, Web Apps & Mobile App Development',
    description:
      'IT company specializing in website development, custom web applications, and mobile app development.',
    images: [
      {
        url: '/assets/images/Hollandse-1771785992532.jpg',
        width: 1200,
        height: 630,
        alt: 'TechAntum - Digital Solutions Company',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TechAntum | Websites, Web Apps & Mobile App Development',
    description:
      'IT company specializing in website development, custom web applications, and mobile app development.',
    images: ['/assets/images/Hollandse-1771785992532.jpg'],
    creator: '@techantum',
  },
  verification: {
    google: '84fEzKK3VJyDEiImbSG47IfCyMdkEGZlbFIo-QeHi6U',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://assets.mixkit.co" />
        <link rel="dns-prefetch" href="https://assets.mixkit.co" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />

        {/* Font optimization with font-display swap */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
        />
</head>
      <body>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <ScrollRevealProvider />
        {children}
        <WhatsAppWidget phoneNumber="917032923474" />
      </body>
    </html>
  );
}
