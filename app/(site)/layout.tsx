import type { ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { TopBar } from '@/components/layout/TopBar';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-obsidian">
        Skip to content
      </a>
      <TopBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
