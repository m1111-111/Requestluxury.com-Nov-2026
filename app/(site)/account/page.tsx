import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Clock } from 'lucide-react';
import { Price } from '@/components/ui/Price';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { updateProfileName } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Account',
  robots: { index: false, follow: false },
};

interface MyBid {
  listing_id: string;
  title: string;
  slug: string;
  image: string | null;
  current_highest_bid_usd: number;
  auction_end_time: string | null;
  my_highest_bid_usd: number;
  paddle: string;
  i_am_highest: boolean;
}

export default async function AccountPage() {
  const { supabase, user, profile } = await requireUser('/account');
  const { data } = await supabase.rpc('my_bids');
  const bids = (data ?? []) as MyBid[];
  const role = profile?.role ?? 'buyer';

  return (
    <section className="container-rl py-14 md:py-20">
      <p className="eyebrow">Members</p>
      <h1 className="display mt-4 text-5xl text-obsidian md:text-6xl">{profile?.full_name ? `Welcome, ${profile.full_name.split(' ')[0]}` : 'Your account'}</h1>

      <div className="mt-12 grid gap-8 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <div className="border border-sand bg-white p-6">
            <p className="label">Signed in as</p>
            <p className="break-all text-[15px] font-semibold text-obsidian">{user.email}</p>
            <p className="mt-4 flex items-center gap-2 text-sm">
              {profile?.is_verified_buyer ? (
                <>
                  <BadgeCheck aria-hidden="true" className="h-4 w-4 text-gold-deep" />
                  Verified buyer: you can bid in auctions.
                </>
              ) : (
                <>
                  <Clock aria-hidden="true" className="h-4 w-4 text-stone" />
                  Not yet verified for bidding.
                </>
              )}
            </p>
            {!profile?.is_verified_buyer && (
              <p className="mt-2 text-xs leading-relaxed text-stone">
                Open any live auction and choose “Request bidder verification”, or <Link href="/contact" className="text-gold-deep underline underline-offset-2">contact the concierge</Link>.
              </p>
            )}

            <form action={updateProfileName} className="mt-6 border-t border-sand pt-5">
              <label className="label" htmlFor="account-name">
                Full name
              </label>
              <div className="flex gap-2">
                <input id="account-name" name="full_name" required minLength={2} maxLength={160} defaultValue={profile?.full_name ?? ''} autoComplete="name" className="input" />
                <button type="submit" className="btn btn-outline shrink-0">
                  Save
                </button>
              </div>
            </form>
          </div>

          <nav aria-label="Account" className="border border-sand bg-white">
            <Link href="/saved" className="block border-b border-sand px-6 py-4 text-sm font-semibold text-obsidian hover:text-gold-deep">
              Saved listings
            </Link>
            <Link href="/dealer" className="block border-b border-sand px-6 py-4 text-sm font-semibold text-obsidian hover:text-gold-deep">
              {role === 'dealer' ? 'Dealer portal' : 'Sell with us: dealer portal'}
            </Link>
            {role === 'admin' && (
              <Link href="/admin" className="block border-b border-sand px-6 py-4 text-sm font-semibold text-gold-deep">
                Admin dashboard
              </Link>
            )}
            <form action="/auth/sign-out" method="post">
              <button type="submit" className="block w-full px-6 py-4 text-start text-sm font-semibold text-stone hover:text-obsidian">
                Sign out
              </button>
            </form>
          </nav>
        </div>

        <div className="border border-sand bg-white">
          <h2 className="border-b border-sand px-6 py-5 font-serif text-3xl text-obsidian">Your bids</h2>
          {bids.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-stone">You have not placed any bids yet.</p>
              <Link href="/auctions" className="btn btn-dark mt-5">
                View live auctions
              </Link>
            </div>
          ) : (
            <ul>
              {bids.map((bid) => {
                const ended = bid.auction_end_time ? new Date(bid.auction_end_time).getTime() <= Date.now() : true;
                return (
                  <li key={bid.listing_id} className="flex gap-4 border-b border-sand p-5 last:border-b-0">
                    <div className="h-20 w-28 shrink-0 overflow-hidden bg-graphite">
                      {bid.image && <img src={imageUrl(bid.image, 300)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/listing/${bid.slug}`} className="font-serif text-xl leading-tight text-obsidian hover:text-gold-deep">
                        {bid.title}
                      </Link>
                      <p className="mt-1 text-xs text-stone">
                        Paddle {bid.paddle} · {ended ? 'Closed' : 'Closes'} {formatDate(bid.auction_end_time, true)}
                      </p>
                      <p className="mt-2 text-sm">
                        Your bid <Price usd={bid.my_highest_bid_usd} className="font-semibold" /> · Leading bid <Price usd={bid.current_highest_bid_usd} className="font-semibold" />
                      </p>
                    </div>
                    <span className={`chip self-start ${bid.i_am_highest ? 'chip-green' : 'chip-red'}`}>{bid.i_am_highest ? (ended ? 'Won' : 'Leading') : 'Outbid'}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
