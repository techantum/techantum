import { Bricolage_Grotesque, Inter } from 'next/font/google';

export const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-bricolage',
  adjustFontFallback: true,
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: true,
});

export const fontVariables = `${bricolageGrotesque.variable} ${inter.variable}`;
