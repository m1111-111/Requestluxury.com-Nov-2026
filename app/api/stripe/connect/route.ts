import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { SITE } from '@/lib/constants';
import { getStripe } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase/service';
import type { ManagedDealer } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe Connect Express onboarding for a dealer. Creates the connected account on
 * first use, stores its id against the dealer, and returns Stripe's hosted
 * onboarding link. Once onboarding is complete, "Buy via Stripe" sales of the
 * dealer's listings are paid out to that account.
 */
export async function POST() {
  const context = await getSessionContext();
  if (!context) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const { data } = await context.supabase.rpc('manage_dealers');
  const dealer = ((data ?? []) as ManagedDealer[]).find((item) => item.owner_id === context.user.id);
  if (!dealer) return NextResponse.json({ error: 'No dealer profile is linked to this account.' }, { status: 403 });
  if (dealer.status !== 'approved') {
    return NextResponse.json({ error: 'Payouts can be set up once your dealer profile has been approved.' }, { status: 403 });
  }

  const stripe = getStripe();
  const service = getServiceClient();
  if (!stripe || !service) {
    return NextResponse.json({ error: 'Payouts are being enabled. Please contact the concierge desk.' }, { status: 503 });
  }

  try {
    let accountId = dealer.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: dealer.contact_email,
        business_profile: { name: dealer.company_name, url: dealer.website_url ?? undefined },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { dealer_id: dealer.id },
      });
      accountId = account.id;
      const { error } = await service.from('dealers').update({ stripe_account_id: accountId }).eq('id', dealer.id);
      if (error) throw new Error(error.message);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${SITE.url}/dealer?payouts=retry`,
      return_url: `${SITE.url}/dealer?payouts=done`,
    });
    return NextResponse.json({ url: link.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(`[stripe-connect] ${error instanceof Error ? error.message : error}`);
    return NextResponse.json({ error: 'We could not start payout onboarding. Please try again shortly.' }, { status: 502 });
  }
}
