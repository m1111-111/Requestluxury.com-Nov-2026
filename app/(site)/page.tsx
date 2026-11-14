import Link from 'next/link';
import { ArrowRight, FileLock2, Gavel, Headset } from 'lucide-react';
import { Hero } from '@/components/home/Hero';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { SponsorBanner } from '@/components/sponsor/SponsorBanner';
import { T } from '@/components/ui/T';
import { CONCIERGE_SERVICES } from '@/lib/concierge';
import { FEES, SITE, VERTICALS } from '@/lib/constants';
import { getFeaturedListings, getLiveAuctions, getSponsorFor, getVerticalCounts } from '@/lib/data';
import { imageUrl } from '@/lib/images';
import type { TranslationKey } from '@/lib/i18n';

export const revalidate = 120;

export const metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [featured, auctions, counts, sponsor] = await Promise.all([
    getFeaturedListings(6),
    getLiveAuctions(3),
    getVerticalCounts(),
    getSponsorFor('home'),
  ]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: SITE.name, url: SITE.url, email: SITE.conciergeEmail, description: SITE.description },
      {
        '@type': 'WebSite',
        name: SITE.name,
        url: SITE.url,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE.url}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <Hero />

      {/* Six verticals */}
      <section className="container-rl py-20 md:py-28">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">The marketplace</p>
            <h2 className="display mt-4 text-4xl md:text-6xl">
              <T k="section.verticals" />
            </h2>
          </div>
          <div className="rule-gold md:mb-4" />
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERTICALS.map((vertical, index) => (
            <Link
              key={vertical.slug}
              href={`/${vertical.slug}`}
              className={`group relative isolate flex min-h-[19rem] flex-col justify-end overflow-hidden bg-graphite p-7 text-white ${[0, 3, 4].includes(index) ? 'lg:col-span-2' : ''}`}
            >
              <img
                src={imageUrl(vertical.image, [0, 3, 4].includes(index) ? 1400 : 900)}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
              />
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-obsidian via-obsidian/35 to-transparent" />
              <span className="eyebrow eyebrow-light">
                {counts[vertical.slug] ? `${counts[vertical.slug]} listed` : vertical.singular}
              </span>
              <span className="mt-2 font-serif text-4xl leading-none">
                <T k={`nav.${vertical.slug}` as TranslationKey} />
              </span>
              <span className="mt-3 flex items-center justify-between gap-4 text-sm text-white/70">
                {vertical.blurb}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-1 rtl:rotate-180" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured collection */}
      <section className="bg-ivory py-20 md:py-28">
        <div className="container-rl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">
                <T k="section.featured_sub" />
              </p>
              <h2 className="display mt-4 text-4xl md:text-6xl">
                <T k="section.featured" />
              </h2>
            </div>
            <Link href="/search" className="btn btn-outline self-start md:self-auto">
              <T k="section.view_all" />
              <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
          <div className="mt-12">
            <ListingGrid listings={featured} eagerCount={3} />
          </div>
        </div>
      </section>

      {/* Live auctions */}
      {auctions.length > 0 && (
        <section className="container-rl py-20 md:py-28">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">
                <T k="section.auctions_sub" />
              </p>
              <h2 className="display mt-4 text-4xl md:text-6xl">
                <T k="section.auctions" />
              </h2>
            </div>
            <Link href="/auctions" className="btn btn-outline self-start md:self-auto">
              <T k="nav.auctions" />
              <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
          <div className="mt-12">
            <ListingGrid listings={auctions} />
          </div>
        </section>
      )}

      {sponsor && (
        <section className="container-rl pb-20 md:pb-28">
          <SponsorBanner sponsor={sponsor} placement="home" />
        </section>
      )}

      {/* How it works */}
      <section className="bg-obsidian py-20 text-white md:py-28">
        <div className="container-rl">
          <p className="eyebrow eyebrow-light">Verified & private</p>
          <h2 className="display mt-4 max-w-3xl text-4xl md:text-6xl">
            <T k="section.how" />
          </h2>
          <div className="mt-14 grid gap-px bg-white/10 md:grid-cols-3">
            {[
              {
                icon: FileLock2,
                number: '01',
                title: 'Curated inventory & private deal rooms',
                text: 'Dealers are vetted and every listing is moderated before it is published. Floor plans, provenance files and survey summaries are released in a private deal room when you register your interest.',
              },
              {
                icon: Gavel,
                number: '02',
                title: 'Live auctions & multi-currency pricing',
                text: `Prices convert to your currency at the live rate. Buy outright, place a refundable hold deposit, or bid in a timed auction with a ${Math.round(FEES.auctionPremiumRate * 100)}% winning bidder premium and anti-sniping extensions.`,
              },
              {
                icon: Headset,
                number: '03',
                title: 'Specialist concierge & jet charter',
                text: `Each enquiry receives a reference and is protected for ${FEES.protectionMonths} months. Our concierge introduces you to the specialist and arranges the charter, FX and insurance around your purchase.`,
              },
            ].map(({ icon: Icon, number, title, text }) => (
              <div key={number} className="bg-obsidian p-8 md:p-10">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-5xl text-gold">{number}</span>
                  <Icon aria-hidden="true" className="h-7 w-7 text-gold/70" strokeWidth={1.25} />
                </div>
                <h3 className="mt-8 font-serif text-[1.7rem] leading-tight">{title}</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-white/65">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Concierge */}
      <section className="container-rl py-20 md:py-28">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Beyond the purchase</p>
            <h2 className="display mt-4 text-4xl md:text-6xl">
              <T k="section.concierge" />
            </h2>
          </div>
          <Link href="/concierge" className="btn btn-outline self-start md:self-auto">
            <T k="section.view_all" />
            <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
        <div className="mt-12 grid gap-px border border-sand bg-sand sm:grid-cols-2 lg:grid-cols-3">
          {CONCIERGE_SERVICES.filter((service) => service.inNav)
            .slice(0, 6)
            .map((service) => (
              <Link key={service.slug} href={`/concierge/${service.slug}`} className="group bg-white p-8 transition-colors hover:bg-ivory">
                <p className="eyebrow">{service.eyebrow}</p>
                <h3 className="mt-3 font-serif text-[1.7rem] leading-tight text-obsidian">{service.navLabel}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone">{service.summary}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">
                  Enquire
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* Dealers */}
      <section className="bg-ivory">
        <div className="container-rl grid gap-10 py-20 md:grid-cols-[1.3fr_1fr] md:items-center md:py-24">
          <div>
            <p className="eyebrow">For dealers, brokers & agencies</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">List your inventory as a Founding Partner, free.</h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
              Syndicate your stock by form, CSV or XML feed and receive qualified, registered introductions. Or commission a custom
              showroom site with an AI WhatsApp assistant, built in five days for £{FEES.showroomPriceGbp.toLocaleString('en-GB')}.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Link href="/sell-with-us" className="btn btn-dark">
              <T k="nav.sell" />
            </Link>
            <Link href="/sell-with-us#showroom" className="btn btn-outline">
              Custom showroom
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
