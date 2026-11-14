import type { Metadata } from 'next';
import { FiltersBar } from '@/components/listings/FiltersBar';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { Pagination } from '@/components/listings/Pagination';
import { T } from '@/components/ui/T';
import { getListings } from '@/lib/data';
import { parseListingSearch, type RawSearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Search the Collection',
  description: 'Search residences, supercars, yachts, aircraft, watches and jewels across the RequestLuxury marketplace.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const search = parseListingSearch(await searchParams);
  const results = await getListings(search.filters);

  return (
    <section className="container-rl py-14 md:py-20">
      <p className="eyebrow">All categories</p>
      <h1 className="display mt-4 text-5xl md:text-6xl">
        {search.filters.q ? <>Results for “{search.filters.q}”</> : <T k="section.featured" />}
      </h1>
      <div className="mt-10">
        <FiltersBar key={JSON.stringify(search.filterValues)} basePath="/search" initial={search.filterValues} />
      </div>
      <p className="mb-8 mt-6 text-sm text-stone">
        {results.total} <T k="section.results" />
      </p>
      <ListingGrid listings={results.items} eagerCount={3} />
      <Pagination basePath="/search" params={search.params} page={results.page} pageSize={results.pageSize} total={results.total} />
    </section>
  );
}
