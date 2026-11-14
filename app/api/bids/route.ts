import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getPublicClient } from '@/lib/supabase/public';
import { createServerSupabase } from '@/lib/supabase/server';
import { isUuid, readJson, toNumber } from '@/lib/validation';
import type { AuctionState } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** Live auction state. Signed-in bidders also receive their paddle and standing. */
export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get('listing_id');
  if (!isUuid(listingId)) return NextResponse.json({ error: 'Invalid listing.' }, { status: 400, headers: noStore });

  const sessionClient = await createServerSupabase();
  const supabase = sessionClient ?? getPublicClient();
  if (!supabase) return NextResponse.json({ state: null, signed_in: false }, { headers: noStore });

  let signedIn = false;
  if (sessionClient) {
    const { data } = await sessionClient.auth.getUser();
    signedIn = Boolean(data.user);
  }
  const { data, error } = await supabase.rpc('auction_state', { p_listing_id: listingId });
  if (error) console.error(`[bids] auction_state failed: ${error.message}`);
  return NextResponse.json({ state: (data as AuctionState | null) ?? null, signed_in: signedIn }, { headers: noStore });
}

/**
 * Places a bid. Every rule (verified bidder, open auction, minimum increment, no
 * self-bidding, the 120-second anti-sniping extension) is enforced by the database
 * trigger on auction_bids, so it holds however a bid reaches the table.
 */
export async function POST(request: Request) {
  if (!rateLimit(`bids:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many bids at once. Please wait a moment.' }, { status: 429, headers: noStore });
  }
  const body = await readJson(request);
  const amount = toNumber(body?.amount);
  if (!body || !isUuid(body.listing_id) || amount === null || amount <= 0 || amount > 99_999_999_999) {
    return NextResponse.json({ error: 'Please enter a valid bid.' }, { status: 400, headers: noStore });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Bidding is not connected yet.' }, { status: 503, headers: noStore });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to place a bid.' }, { status: 401, headers: noStore });

  const { error } = await supabase
    .from('auction_bids')
    .insert({ listing_id: body.listing_id, bidder_id: user.id, bid_amount_usd: Math.round(amount * 100) / 100 });

  const { data: state } = await supabase.rpc('auction_state', { p_listing_id: body.listing_id });

  if (error) {
    // Messages raised by the auction trigger are written for bidders; anything else is generic.
    const known = /minimum bid|verified buyers|auction has closed|not open for bidding|own lots|sign in/i.test(error.message);
    const rlsDenied = error.code === '42501' && !known;
    return NextResponse.json(
      {
        error: known ? error.message : rlsDenied ? 'Bidding is reserved for verified buyers.' : 'Your bid could not be placed. Please try again.',
        state: (state as AuctionState | null) ?? null,
        signed_in: true,
      },
      { status: known || rlsDenied ? 422 : 500, headers: noStore },
    );
  }
  return NextResponse.json({ state: (state as AuctionState | null) ?? null, signed_in: true }, { headers: noStore });
}
