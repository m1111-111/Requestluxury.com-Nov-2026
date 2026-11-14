import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FiltersBar } from '@/components/listings/FiltersBar';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { Pagination } from '@/components/listings/Pagination';
import { SponsorBanner } from '@/components/sponsor/SponsorBanner';
import { T } from '@/components/ui/T';
import { SITE, VERTICALS, getVertical } from '@/lib/constants';
import { getListings, getSponsorFor } from '@/lib/data';
import { imageUrl } from '@/lib/images';
import type { TranslationKey } from '@/lib/i18n';
import { parseListingSearch, type RawSearchParams } from '@/lib/search-params';

interface PageProps {
  params: Promise<{ vertical: string }>;
  searchParams: Promise<RawSearchParams>;
}

// Only the six verticals exist at the top level; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return VERTICALS.map((vertical) => ({ vertical: vertical.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vertical: slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) return {};
  const title = `${vertical.label} for Sale: ${vertical.blurb}`;
  return {
    title,
    description: vertical.intro,
    alternates: { canonical: `/${vertical.slug}` },
    openGraph: {
      type: 'website',
      title: `${title} · ${SITE.name}`,
      description: vertical.intro,
      url: `${SITE.url}/${vertical.slug}`,
      images: [{ url: imageUrl(vertical.image, 1200), width: 1200, alt: `${vertical.label} on RequestLuxury` }],
    },
    twitter: { card: 'summary_large_image', title, description: vertical.intro, images: [imageUrl(vertical.image, 1200)] },
  };
}

export default async function VerticalPage({ params, searchParams }: PageProps) {
  const { vertical: slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) notFound();

  const search = parseListingSearch(await searchParams);
  const [results, sponsor] = await Promise.all([
    getListings({ ...search.filters, vertical: vertical.slug }),
    getSponsorFor(vertical.slug),
  ]);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-obsidian text-white">
        <img src={imageUrl(vertical.image, 1800, 60)} alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-obsidian via-obsidian/60 to-obsidian/40" />
        <div className="container-rl py-20 md:py-28">
          <p className="eyebrow eyebrow-light">{vertical.blurb}</p>
          <h1 className="display mt-5 text-5xl md:text-7xl">
            <T k={`nav.${vertical.slug}` as TranslationKey} />
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75">{vertical.intro}</p>
        </div>
      </section>

      <section className="container-rl py-12 md:py-16">
        <FiltersBar key={JSON.stringify(search.filterValues)} basePath={`/${vertical.slug}`} initial={search.filterValues} />
        <p className="mb-8 mt-6 text-sm text-stone">
          {results.total} <T k="section.results" />
        </p>
        <ListingGrid listings={results.items} eagerCount={3} />
        <Pagination basePath={`/${vertical.slug}`} params={search.params} page={results.page} pageSize={results.pageSize} total={results.total} />
      </section>

      {sponsor && (
        <section className="container-rl pb-20">
          <SponsorBanner sponsor={sponsor} placement={vertical.slug} />
        </section>
      )}
    </>
  );
}
