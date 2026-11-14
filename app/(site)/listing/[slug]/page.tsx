import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, ChevronRight, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { AffiliateBox } from '@/components/listing/AffiliateBox';
import { ContactCard } from '@/components/listing/ContactCard';
import { DealRoom } from '@/components/listing/DealRoom';
import { Gallery } from '@/components/listing/Gallery';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { T } from '@/components/ui/T';
import { SITE, getVertical } from '@/lib/constants';
import { getListingBySlug, getRelatedListings, getSitemapListings } from '@/lib/data';
import { formatSpecValue, humanizeKey, orderSpecs, truncate } from '@/lib/format';
import { imageUrl, resolveVideo, videoPoster } from '@/lib/images';
import { cardFacts } from '@/lib/listing-facts';
import type { TranslationKey } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const listings = await getSitemapListings();
  return listings.slice(0, 200).map((listing) => ({ slug: listing.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: 'Listing not found', robots: { index: false } };

  const vertical = getVertical(listing.vertical);
  const title = `${listing.title} | ${listing.city}, ${listing.country}`;
  const description = truncate(listing.description, 158);
  const image = listing.images[0] ? imageUrl(listing.images[0], 1200, 75) : vertical ? imageUrl(vertical.image, 1200) : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/listing/${listing.slug}` },
    openGraph: {
      type: 'article',
      title: `${title} · ${SITE.name}`,
      description,
      url: `${SITE.url}/listing/${listing.slug}`,
      images: image ? [{ url: image, width: 1200, alt: listing.title }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}

export default async function ListingPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const vertical = getVertical(listing.vertical);
  const related = await getRelatedListings(listing, 3);
  const video = resolveVideo(listing.video_url);
  const specs = orderSpecs(Object.entries(listing.specs ?? {}).filter(([, value]) => value !== null && value !== ''));
  const paragraphs = listing.description.split(/\n{2,}/).map((text) => text.trim()).filter(Boolean);
  const isDubaiResidence = listing.vertical === 'residences' && listing.city.trim().toLowerCase() === 'dubai';
  const verified = Boolean(listing.dealer?.is_verified) && !listing.is_showcase;
  const facts = cardFacts(listing);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: truncate(listing.description, 500),
    image: listing.images.slice(0, 6).map((src) => imageUrl(src, 1200)),
    category: vertical?.label,
    url: `${SITE.url}/listing/${listing.slug}`,
    ...(listing.public_price_usd !== null && !listing.is_auction
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: listing.public_price_usd,
            availability: 'https://schema.org/InStock',
            url: `${SITE.url}/listing/${listing.slug}`,
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />

      <div className="container-rl pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-stone">
          <Link href="/" className="hover:text-gold-deep">
            Home
          </Link>
          <ChevronRight aria-hidden="true" className="h-3 w-3 rtl:rotate-180" />
          {vertical && (
            <>
              <Link href={`/${vertical.slug}`} className="hover:text-gold-deep">
                <T k={`nav.${vertical.slug}` as TranslationKey} />
              </Link>
              <ChevronRight aria-hidden="true" className="h-3 w-3 rtl:rotate-180" />
            </>
          )}
          <span aria-current="page" className="truncate text-charcoal">
            {listing.title}
          </span>
        </nav>

        <header className="mb-8 mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              {listing.city}, {listing.country}
            </p>
            <h1 className="display mt-3 text-4xl text-obsidian md:text-[3.4rem]">{listing.title}</h1>
            {facts && <p className="mt-4 text-[15px] text-stone">{facts}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {listing.is_showcase && (
              <span className="chip chip-dark">
                <Sparkles aria-hidden="true" className="me-1.5 h-3 w-3" />
                <T k="card.showcase" />
              </span>
            )}
            {verified && (
              <span className="chip chip-gold">
                <BadgeCheck aria-hidden="true" className="me-1.5 h-3 w-3" />
                <T k="card.verified" />
              </span>
            )}
            {listing.property_status === 'off_plan' && <span className="chip">Off-plan</span>}
            {listing.property_status === 'ready_built' && <span className="chip">Ready to occupy</span>}
            {listing.quality_score >= 80 && (
              <span className="chip">
                <T k="card.quality" /> {listing.quality_score}/100
              </span>
            )}
          </div>
        </header>

        <Gallery images={listing.images} title={listing.title} />
      </div>

      <div className="container-rl grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:py-16">
        <div className="min-w-0 space-y-14">
          {listing.is_showcase && (
            <p className="border-s-2 border-gold bg-ivory px-5 py-4 text-sm leading-relaxed text-charcoal">
              <strong className="font-semibold">Showcase listing.</strong> This is an illustrative example of how assets are presented on RequestLuxury. Enquiries go to our concierge desk, who can source a comparable asset for you.
            </p>
          )}

          <section aria-labelledby="about-title">
            <p className="eyebrow">{vertical?.singular}</p>
            <h2 id="about-title" className="mt-3 font-serif text-3xl text-obsidian md:text-4xl">
              <T k="detail.about" />
            </h2>
            <div className="prose-rl mt-6 max-w-3xl text-[1.02rem]">
              {paragraphs.map((text, index) => (
                <p key={index}>{text}</p>
              ))}
            </div>
          </section>

          {isDubaiResidence && listing.trakheesi_permit_number && (
            <section aria-label="Dubai advertising permit" className="flex flex-wrap items-center gap-4 border border-gold/50 bg-white px-6 py-5">
              <ShieldCheck aria-hidden="true" className="h-9 w-9 shrink-0 text-gold-deep" strokeWidth={1.25} />
              <div>
                <p className="eyebrow">Dubai Land Department · Trakheesi permit</p>
                <p className="mt-1 font-serif text-2xl text-obsidian">{listing.trakheesi_permit_number}</p>
              </div>
              <p className="ms-auto max-w-xs text-xs leading-relaxed text-stone">
                Property advertising in Dubai is licensed. Verify this permit through the Dubai Land Department before you proceed.
              </p>
            </section>
          )}

          {specs.length > 0 && (
            <section aria-labelledby="specs-title">
              <h2 id="specs-title" className="font-serif text-3xl text-obsidian md:text-4xl">
                <T k="detail.specs" />
              </h2>
              <dl className="mt-6 grid border-s border-t border-sand sm:grid-cols-2 lg:grid-cols-3">
                {specs.map(([key, value]) => (
                  <div key={key} className="border-b border-e border-sand bg-white px-5 py-4">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">{humanizeKey(key)}</dt>
                    <dd className="mt-1.5 text-[15px] font-medium text-obsidian">{formatSpecValue(key, value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {video && (
            <section aria-labelledby="film-title">
              <h2 id="film-title" className="font-serif text-3xl text-obsidian md:text-4xl">
                Film
              </h2>
              <div className="mt-6 aspect-video overflow-hidden bg-obsidian">
                {video.kind === 'iframe' ? (
                  <iframe
                    src={video.src}
                    title={`${listing.title} film`}
                    loading="lazy"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="h-full w-full"
                  />
                ) : (
                  <video src={video.src} poster={videoPoster(video.src) ?? undefined} controls playsInline preload="none" className="h-full w-full" />
                )}
              </div>
            </section>
          )}

          <DealRoom listingId={listing.id} preview={listing.deal_room_preview ?? []} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <ContactCard listing={listing} />
          <AffiliateBox vertical={listing.vertical} />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="bg-ivory py-16 md:py-20">
          <div className="container-rl">
            <p className="eyebrow">{vertical?.label}</p>
            <h2 className="display mb-10 mt-4 text-4xl md:text-5xl">
              <T k="section.related" />
            </h2>
            <ListingGrid listings={related} />
          </div>
        </section>
      )}
    </>
  );
}
