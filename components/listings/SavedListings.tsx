'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSaved } from '@/lib/saved';
import type { Listing } from '@/types';
import { ListingCard } from './ListingCard';

/** The visitor's saved shortlist, loaded from the ids kept in their browser. */
export function SavedListings() {
  const { ids, ready } = useSaved();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const key = ids.join(',');

  useEffect(() => {
    if (!ready) return;
    if (!key) {
      setListings([]);
      return;
    }
    let active = true;
    fetch(`/api/listings?ids=${encodeURIComponent(key)}`)
      .then((response) => (response.ok ? response.json() : { listings: [] }))
      .then((body: { listings?: Listing[] }) => {
        if (active) setListings(body.listings ?? []);
      })
      .catch(() => {
        if (active) setListings([]);
      });
    return () => {
      active = false;
    };
  }, [key, ready]);

  if (listings === null) {
    return <p className="text-sm text-stone">Loading your shortlist…</p>;
  }
  if (listings.length === 0) {
    return (
      <div className="border border-dashed border-sand bg-white px-6 py-16 text-center">
        <p className="font-serif text-2xl text-obsidian">Nothing saved yet</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-stone">Tap the heart on any listing to keep it here. Your shortlist stays on this device.</p>
        <Link href="/search" className="btn btn-dark mt-6">
          Browse the collection
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
