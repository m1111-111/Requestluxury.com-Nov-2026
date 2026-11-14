import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="hero-poster flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center text-white">
      <Logo tone="light" />
      <p className="eyebrow eyebrow-light mt-14">Error 404</p>
      <h1 className="display mt-4 text-5xl md:text-7xl">This page has been sold, moved or never existed</h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70">
        The asset you are looking for may have been withdrawn. Browse the collection, or tell our concierge what you want and we will find it.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn btn-gold">
          Return to the collection
        </Link>
        <Link href="/concierge/asset-sourcing" className="btn btn-outline-light">
          Start a bespoke search
        </Link>
      </div>
    </main>
  );
}
