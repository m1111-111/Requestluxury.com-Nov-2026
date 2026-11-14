import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { paymentNotificationEmail, sendEmail } from '@/lib/email';
import { formatMinor, getStripe } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase/service';
import { isUuid } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAYMENT_KINDS = ['showroom_deposit', 'hold_deposit', 'direct_buy', 'auction_settlement', 'dealer_subscription'];

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

/**
 * Stripe webhook. Add the endpoint https://<your-domain>/api/stripe/webhook in the
 * Stripe Dashboard with these events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired,
 *   customer.subscription.deleted, charge.refunded
 * The signature is verified with STRIPE_WEBHOOK_SECRET before anything is trusted.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  if (!stripe || !secret) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch (error) {
    console.warn(`[stripe-webhook] signature check failed: ${error instanceof Error ? error.message : error}`);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    // Responding 503 makes Stripe retry, so no payment is lost while the key is being added.
    console.error('[stripe-webhook] SUPABASE_SERVICE_ROLE_KEY is not set; the event will be retried by Stripe.');
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }

  const recordSession = async (session: Stripe.Checkout.Session, status: PaymentStatus) => {
    const metadata = session.metadata ?? {};
    const kind = PAYMENT_KINDS.includes(metadata.kind ?? '') ? (metadata.kind as string) : null;
    if (!kind) return;
    const listingId = isUuid(metadata.listing_id) ? metadata.listing_id : null;
    const dealerId = isUuid(metadata.dealer_id) ? metadata.dealer_id : null;
    const buyerEmail = session.customer_details?.email ?? session.customer_email ?? metadata.buyer_email ?? null;

    const { error } = await supabase.from('payments').upsert(
      {
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
        kind,
        listing_id: listingId,
        dealer_id: dealerId,
        lead_reference_code: metadata.lead_reference ?? null,
        buyer_email: buyerEmail,
        amount_total: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? 'gbp',
        status,
        metadata,
      },
      { onConflict: 'stripe_session_id' },
    );
    if (error) throw new Error(`payments upsert failed: ${error.message}`);

    let listingTitle: string | null = null;
    if (listingId) {
      const { data } = await supabase.from('listings').select('title').eq('id', listingId).maybeSingle();
      listingTitle = (data as { title: string } | null)?.title ?? null;
    }

    if (status === 'paid') {
      // A unique asset that has been paid for comes off the market at once.
      if (listingId && (kind === 'direct_buy' || kind === 'auction_settlement')) {
        await supabase
          .from('listings')
          .update({ moderation_status: 'archived', admin_notes: `Sold through Stripe checkout ${session.id} (${metadata.lead_reference ?? 'no reference'}).` })
          .eq('id', listingId);
      }
      if (kind === 'dealer_subscription' && dealerId && (metadata.tier === 'pro' || metadata.tier === 'elite')) {
        await supabase.from('dealers').update({ subscription_tier: metadata.tier }).eq('id', dealerId);
      }
      if (metadata.lead_reference) {
        await supabase.from('leads').update({ admin_status: kind === 'hold_deposit' ? 'new' : 'closed_won' }).eq('lead_reference_code', metadata.lead_reference).neq('admin_status', 'archived');
      }
    }

    await sendEmail(
      paymentNotificationEmail({
        kind,
        status,
        amount: formatMinor(session.amount_total, session.currency),
        buyerEmail,
        reference: metadata.lead_reference ?? null,
        listingTitle,
      }),
    );
  };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Bank transfers complete the session before the money arrives.
        await recordSession(session, session.payment_status === 'unpaid' ? 'pending' : 'paid');
        break;
      }
      case 'checkout.session.async_payment_succeeded':
        await recordSession(event.data.object, 'paid');
        break;
      case 'checkout.session.async_payment_failed':
        await recordSession(event.data.object, 'failed');
        break;
      case 'checkout.session.expired':
        await recordSession(event.data.object, 'expired');
        break;
      case 'customer.subscription.deleted': {
        const dealerId = event.data.object.metadata?.dealer_id;
        if (isUuid(dealerId)) {
          await supabase.from('dealers').update({ subscription_tier: 'founding_free' }).eq('id', dealerId);
        }
        break;
      }
      case 'charge.refunded': {
        const intent = event.data.object.payment_intent;
        const intentId = typeof intent === 'string' ? intent : intent?.id;
        if (intentId && event.data.object.refunded) {
          await supabase.from('payments').update({ status: 'refunded' }).eq('stripe_payment_intent_id', intentId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] ${event.type} failed: ${error instanceof Error ? error.message : error}`);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
