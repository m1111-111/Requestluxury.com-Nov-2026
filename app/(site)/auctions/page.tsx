import type { Metadata } from 'next';
import Link from 'next/link';
import { ListingGrid } from '@/components/listings/ListingGrid';
import { T } from '@/components/ui/T';
import { FEES } from '@/lib/constants';
import { getClosedAuctions, getLiveAuctions } from '@/lib/data';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live Timed Auctions',
  description:
    'Timed online auctions for collector cars, watches and jewels. Bidding is open to verified buyers, with anti-sniping extensions and a transparent winning bidder premium.',
  alternates: { canonical: '/auctions' },
};

export default async function AuctionsPage() {
  const [live, closed] = await Promise.all([getLiveAuctions(24), getClosedAuctions(6)]);
  const premium = Math.round(FEES.auctionPremiumRate * 100);

  return (
    <>
      <section className="bg-obsidian text-white">
        <div className="container-rl py-20 md:py-24">
          <p className="eyebrow eyebrow-light">
            <T k="section.auctions_sub" />
          </p>
          <h1 className="display mt-5 text-5xl md:text-7xl">
            <T k="nav.auctions" />
          </h1>
          <div className="mt-10 grid gap-px bg-white/10 md:grid-cols-3">
            {[
              ['Verified bidders only', 'Create an account and ask the concierge to verify you. Every bidder appears by paddle number, never by name.'],
              ['Two-minute extensions', 'A bid in the final 120 seconds extends the auction by 120 seconds, so the best bid wins, not the fastest click.'],
              [`${premium}% winning bidder premium`, `The winner pays the hammer price plus ${premium}%. Lots with a reserve sell only when the reserve is met.`],
            ].map(([title, text]) => (
              <div key={title} className="bg-obsidian p-7">
                <h2 className="font-serif text-2xl text-gold">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-rl py-14 md:py-20">
        {live.length > 0 ? (
          <ListingGrid listings={live} eagerCount={3} />
        ) : (
          <div className="border border-dashed border-sand bg-white px-6 py-16 text-center">
            <p className="font-serif text-2xl text-obsidian">No auctions are open right now.</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-stone">
              New lots are announced to registered buyers first. Create an account to be told when bidding opens.
            </p>
            <Link href="/sign-in" className="btn btn-dark mt-6">
              Register to bid
            </Link>
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section className="bg-ivory py-14 md:py-20">
          <div className="container-rl">
            <p className="eyebrow">Recently closed</p>
            <h2 className="display mb-10 mt-4 text-4xl md:text-5xl">Past lots</h2>
            <ListingGrid listings={closed} />
          </div>
        </section>
      )}
    </>
  );
}
