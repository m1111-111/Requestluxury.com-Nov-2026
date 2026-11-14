import { NextResponse, after } from 'next/server';
import type Stripe from 'stripe';
import { getSessionContext } from '@/lib/auth';
import { FEES, SITE } from '@/lib/constants';
import { LISTING_COLUMNS } from '@/lib/data';
import { getRates } from '@/lib/fx';
import { formatNumber } from '@/lib/format';
import { sendLeadEmails, submitLead, type LeadInput } from '@/lib/leads';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { chargeCurrency, createCheckoutSession, getStripe, isStripeLive, usdToMinor, type ChargeCurrency } from '@/lib/stripe';
import { getPublicClient } from '@/lib/supabase/public';
import { createServerSupabase } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/service';
import { cleanText, isEmail, isUuid, readJson } from '@/lib/validation';
import type { AuctionState, Listing, ManagedDealer } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Kind = 'showroom_deposit' | 'direct_buy' | 'hold_deposit' | 'auction_settlement' | 'dealer_subscription';
const KINDS: Kind[] = ['showroom_deposit', 'direct_buy', 'hold_deposit', 'auction_settlement', 'dealer_subscription'];

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** A registered request that will be completed by the concierge rather than online. */
function offline(reference: string, message: string) {
  return NextResponse.json({ reference, message });
}

function lineItem(name: string, description: string, currency: ChargeCurrency, unitAmount: number): Stripe.Checkout.SessionCreateParams.LineItem {
  return { quantity: 1, price_data: { currency, unit_amount: unitAmount, product_data: { name, description } } };
}

/**
 * Creates a Stripe Checkout Session for:
 *  - showroom_deposit    £750 deposit on the £1,500 custom showroom build (invoice issued by Stripe Billing)
 *  - dealer_subscription Pro / Elite dealer plans (Stripe Billing subscription)
 *  - direct_buy          listed price + 3.5% Buyer's Service Fee, paid out to the dealer through Connect
 *  - hold_deposit        refundable concierge hold deposit
 *  - auction_settlement  hammer price + 6% Winning Bidder Premium, for the winning bidder only
 * Every checkout first registers a protected lead, so nothing is lost if payment is abandoned.
 */
export async function POST(request: Request) {
  if (!rateLimit(`checkout:${clientIp(request)}`, 8, 60_000)) return fail('Too many attempts. Please wait a moment and try again.', 429);

  const body = await readJson(request);
  const kind = body?.kind as Kind;
  if (!body || !KINDS.includes(kind)) return fail('Invalid request.', 400);

  const name = cleanText(body.name, 160);
  const email = cleanText(body.email, 320).toLowerCase();
  if (name.length < 2) return fail('Please enter your name.', 400);
  if (!isEmail(email)) return fail('Please enter a valid email address.', 400);

  const stripe = getStripe();
  const sessionClient = await createServerSupabase();
  const supabase = sessionClient ?? getPublicClient();
  const successUrl = `${SITE.url}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;

  const register = async (input: LeadInput, listingTitle: string | null) => {
    const result = await submitLead(input, supabase);
    if (result.ok) {
      const receipt = result.receipt;
      after(() =>
        sendLeadEmails(receipt, {
          leadType: input.leadType,
          name: input.name,
          email: input.email,
          phone: input.phone,
          message: input.message,
          listingTitle,
          details: Object.entries(input.metadata).map(([key, value]) => [key.replace(/_/g, ' '), String(value)] as [string, string]),
        }),
      );
    }
    return result;
  };

  // ── B2B: custom showroom deposit ───────────────────────────────────────────
  if (kind === 'showroom_deposit') {
    const company = cleanText(body.company, 160);
    if (company.length < 2) return fail('Please enter your company name.', 400);
    const lead = await register(
      {
        leadType: 'b2b_web_build',
        name,
        email,
        phone: cleanText(body.phone, 40),
        message: cleanText(body.message, 2000) || 'Custom 5-Day Luxury Showroom & AI WhatsApp Build.',
        listingId: null,
        metadata: { company, website: cleanText(body.website_url, 300), package: 'custom-showroom', deposit_gbp: FEES.showroomDepositGbp },
      },
      null,
    );
    if (!lead.ok) return fail(lead.error, lead.status);
    const reference = lead.receipt.reference;
    if (!stripe) {
      return offline(reference, `Your build request is registered as ${reference}. Online payment is being enabled; our concierge will email a secure link for the £${FEES.showroomDepositGbp} deposit.`);
    }
    try {
      const metadata = { kind, lead_reference: reference, buyer_email: email, company };
      const session = await createCheckoutSession(
        stripe,
        {
          mode: 'payment',
          customer_email: email,
          client_reference_id: reference,
          line_items: [
            lineItem(
              'Custom 5-Day Luxury Showroom & AI WhatsApp Build: 50% deposit',
              `Deposit towards the £${formatNumber(FEES.showroomPriceGbp)} build for ${company}. Balance due on delivery. Ref ${reference}.`,
              'gbp',
              FEES.showroomDepositGbp * 100,
            ),
          ],
          invoice_creation: { enabled: true, invoice_data: { description: `Custom showroom build deposit, ref ${reference}`, metadata } },
          metadata,
          payment_intent_data: { metadata, description: `Showroom build deposit ${reference}` },
          success_url: successUrl,
          cancel_url: `${SITE.url}/checkout/cancelled?from=sell-with-us`,
        },
        { currency: 'gbp', email, name },
      );
      return NextResponse.json({ url: session.url, reference });
    } catch (error) {
      console.error(`[checkout] showroom deposit: ${error instanceof Error ? error.message : error}`);
      return offline(reference, `Your build request is registered as ${reference}. We could not open the payment page just now, so our concierge will email you a secure payment link.`);
    }
  }

  // ── B2B: dealer plan subscription ──────────────────────────────────────────
  if (kind === 'dealer_subscription') {
    const tier = body.tier === 'elite' ? 'elite' : body.tier === 'pro' ? 'pro' : null;
    if (!tier) return fail('Choose the Pro or Elite plan.', 400);
    const context = await getSessionContext();
    if (!context) return fail('Please sign in to manage your plan.', 401);
    const { data } = await context.supabase.rpc('manage_dealers');
    const dealer = ((data ?? []) as ManagedDealer[]).find((item) => item.owner_id === context.user.id);
    if (!dealer) return fail('No dealer profile is linked to this account.', 403);
    if (!stripe) return fail('Online billing is being enabled. Please contact the concierge desk to change plan.', 503);
    try {
      const metadata = { kind, dealer_id: dealer.id, tier };
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: context.user.email ?? email,
        client_reference_id: dealer.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'gbp',
              unit_amount: FEES.dealerPlansGbp[tier] * 100,
              recurring: { interval: 'month' },
              product_data: { name: `RequestLuxury ${tier === 'elite' ? 'Elite' : 'Pro'} Partner plan`, description: dealer.company_name },
            },
          },
        ],
        metadata,
        subscription_data: { metadata },
        success_url: successUrl,
        cancel_url: `${SITE.url}/dealer`,
      });
      return NextResponse.json({ url: session.url });
    } catch (error) {
      console.error(`[checkout] dealer subscription: ${error instanceof Error ? error.message : error}`);
      return fail('We could not open the billing page. Please try again shortly.', 502);
    }
  }

  // ── Listing checkouts ──────────────────────────────────────────────────────
  if (!isUuid(body.listing_id)) return fail('Invalid listing.', 400);
  if (!supabase) return fail('Checkout is not connected yet. Please use the enquiry form.', 503);

  const { data: row } = await supabase
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('id', body.listing_id)
    .eq('moderation_status', 'approved')
    .maybeSingle();
  const listing = row as unknown as Listing | null;
  if (!listing) return fail('This listing is no longer available.', 404);
  if (listing.vertical === 'residences') return fail('Residences are sold by private treaty. Please request the private dossier.', 422);
  if (listing.is_showcase && isStripeLive()) return fail('This is a showcase piece and cannot be purchased. Our concierge can source one like it.', 422);

  const feePercent = (FEES.buyerServiceFeeRate * 100).toFixed(1);
  const premiumPercent = Math.round(FEES.auctionPremiumRate * 100);
  let baseUsd = 0;
  let feeUsd = 0;
  let baseLabel = listing.title;
  let baseDescription = '';
  let feeLabel = '';

  if (kind === 'direct_buy') {
    if (listing.sale_mode !== 'direct_buy' || listing.public_price_usd === null) return fail('This listing cannot be bought online.', 422);
    baseUsd = listing.public_price_usd;
    feeUsd = baseUsd * FEES.buyerServiceFeeRate;
    baseDescription = `${listing.city}, ${listing.country}. Purchase price.`;
    feeLabel = `Buyer's Service Fee (${feePercent}%)`;
  } else if (kind === 'hold_deposit') {
    if (listing.sale_mode !== 'hold_deposit' || listing.deposit_amount_usd <= 0) return fail('This listing does not offer a hold deposit.', 422);
    baseUsd = listing.deposit_amount_usd;
    baseLabel = `Refundable hold deposit: ${listing.title}`;
    baseDescription = 'Credited against the purchase price, or refunded if you do not proceed.';
  } else {
    if (!sessionClient) return fail('Please sign in to settle your winning bid.', 401);
    const { data: stateData } = await sessionClient.rpc('auction_state', { p_listing_id: listing.id });
    const state = stateData as AuctionState | null;
    if (!state || !state.ended) return fail('This auction has not closed yet.', 422);
    if (!state.i_am_highest) return fail('Only the winning bidder can settle this lot.', 403);
    if (state.has_reserve && !state.reserve_met) return fail('The reserve was not met. Our concierge will be in touch.', 422);
    baseUsd = state.current_highest_bid_usd;
    feeUsd = baseUsd * FEES.auctionPremiumRate;
    baseLabel = `Hammer price: ${listing.title}`;
    baseDescription = `Winning bid, paddle ${state.my_paddle ?? ''}.`.trim();
    feeLabel = `Winning Bidder Premium (${premiumPercent}%)`;
  }

  const lead = await register(
    {
      leadType: 'asset_inquiry',
      name,
      email,
      phone: '',
      message: `Checkout started: ${kind.replace(/_/g, ' ')}.`,
      listingId: listing.id,
      metadata: { intent: kind, amount_usd: Math.round((baseUsd + feeUsd) * 100) / 100 },
    },
    listing.title,
  );
  if (!lead.ok) return fail(lead.error, lead.status);
  const reference = lead.receipt.reference;

  if (!stripe) {
    return offline(reference, `Your request is registered as ${reference}. Online payment is being enabled; our concierge will send secure payment instructions by email.`);
  }

  const currency = chargeCurrency();
  const { rates } = await getRates();
  const baseMinor = usdToMinor(baseUsd, currency, rates);
  const feeMinor = feeUsd > 0 ? usdToMinor(feeUsd, currency, rates) : 0;
  if ((baseMinor + feeMinor) / 100 > FEES.maxOnlineChargeMajor) {
    return offline(reference, `Your request is registered as ${reference}. This amount is above the online payment limit, so our concierge will send bank-transfer instructions by email.`);
  }

  const metadata: Record<string, string> = { kind, listing_id: listing.id, lead_reference: reference, buyer_email: email };
  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    metadata,
    description: `${kind.replace(/_/g, ' ')}: ${listing.title} (${reference})`,
  };

  // Stripe Connect: a direct purchase is paid out to the dealer's Express account,
  // with the Buyer's Service Fee retained by the platform.
  if (kind === 'direct_buy' && listing.dealer_id) {
    const service = getServiceClient();
    if (service) {
      const { data: dealerRow } = await service.from('dealers').select('stripe_account_id').eq('id', listing.dealer_id).maybeSingle();
      const accountId = (dealerRow as { stripe_account_id: string | null } | null)?.stripe_account_id;
      if (accountId) {
        try {
          const account = await stripe.accounts.retrieve(accountId);
          if (account.charges_enabled) {
            paymentIntentData.transfer_data = { destination: accountId };
            paymentIntentData.application_fee_amount = feeMinor;
            metadata.connected_account = accountId;
          }
        } catch (error) {
          console.warn(`[checkout] connected account unavailable: ${error instanceof Error ? error.message : error}`);
        }
      }
    }
  }

  const lineItems = [lineItem(baseLabel, baseDescription || `Ref ${reference}`, currency, baseMinor)];
  if (feeMinor > 0) lineItems.push(lineItem(feeLabel, `Ref ${reference}`, currency, feeMinor));

  try {
    const session = await createCheckoutSession(
      stripe,
      {
        mode: 'payment',
        customer_email: email,
        client_reference_id: reference,
        line_items: lineItems,
        metadata,
        payment_intent_data: paymentIntentData,
        success_url: successUrl,
        cancel_url: `${SITE.url}/checkout/cancelled?listing=${encodeURIComponent(listing.slug)}`,
      },
      // Bank transfers settle to the platform balance, so they are offered when no payout split applies.
      paymentIntentData.transfer_data ? null : { currency, email, name },
    );
    return NextResponse.json({ url: session.url, reference });
  } catch (error) {
    console.error(`[checkout] ${kind}: ${error instanceof Error ? error.message : error}`);
    return offline(reference, `Your request is registered as ${reference}. We could not open the payment page just now, so our concierge will send payment instructions by email.`);
  }
}
