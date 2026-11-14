import type { Metadata } from 'next';
import { SavedListings } from '@/components/listings/SavedListings';

export const metadata: Metadata = {
  title: 'Saved Listings',
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  return (
    <section className="container-rl py-14 md:py-20">
      <p className="eyebrow">Your shortlist</p>
      <h1 className="display mb-10 mt-4 text-5xl md:text-6xl">Saved</h1>
      <SavedListings />
    </section>
  );
}
