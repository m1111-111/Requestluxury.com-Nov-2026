import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { PreferencesProvider } from '@/components/providers/PreferencesProvider';
import { SITE } from '@/lib/constants';
import { getRates } from '@/lib/fx';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'RequestLuxury — Global Luxury Marketplace & Private Auctions',
    template: '%s · RequestLuxury',
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: 'RequestLuxury — Global Luxury Marketplace & Private Auctions',
    description: SITE.description,
    url: SITE.url,
    locale: 'en_GB',
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0C',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { rates } = await getRates();
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable}`}>
      <body>
        <PreferencesProvider rates={rates}>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
