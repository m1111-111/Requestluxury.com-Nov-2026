import Link from 'next/link';
import { T } from '@/components/ui/T';
import type { Listing } from '@/types';
import { ListingCard } from './ListingCard';

export function ListingGrid({ listings, eagerCount = 0 }: { listings: Listing[]; eagerCount?: number }) {
  if (listings.length === 0) {
    return (
      <div className="border border-dashed border-sand bg-white px-6 py-16 text-center">
        <p className="font-serif text-2xl text-obsidian">
          <T k="section.no_results" />
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-stone">
          Our dealer desk can source it privately. Tell us what you are looking for and we will reply within 48 hours.
        </p>
        <Link href="/concierge/asset-sourcing" className="btn btn-dark mt-6">
          Start a bespoke search
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing, index) => (
        <ListingCard key={listing.id} listing={listing} eager={index < eagerCount} />
      ))}
    </div>
  );
}
