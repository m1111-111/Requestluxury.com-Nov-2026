import type { Metadata } from 'next';
import Link from 'next/link';
import { CircleCheck, Clock } from 'lucide-react';
import { SITE } from '@/lib/constants';
import { formatMinor, getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payment received',
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const stripe = getStripe();

  let paid = false;
  let pending = false;
  let amount = '';
  let reference = '';
  let email = '';

  if (stripe && sessionId && /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
      pending = session.status === 'complete' && session.payment_status === 'unpaid';
      amount = formatMinor(session.amount_total, session.currency);
      reference = session.metadata?.lead_reference ?? '';
      email = session.customer_details?.email ?? '';
    } catch {
      // Unknown session: fall through to the neutral message below.
    }
  }

  return (
    <section className="container-rl flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-xl text-center">
        {pending ? <Clock aria-hidden="true" className="mx-auto h-12 w-12 text-gold-deep" strokeWidth={1.25} /> : <CircleCheck aria-hidden="true" className="mx-auto h-12 w-12 text-gold-deep" strokeWidth={1.25} />}
        <p className="eyebrow mt-6">{pending ? 'Awaiting your bank transfer' : paid ? 'Payment received' : 'Thank you'}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">
          {pending ? 'Your reservation is being held' : paid ? 'Thank you. It is confirmed.' : 'Your request is with our concierge'}
        </h1>
        <p className="mt-6 text-[15px] leading-relaxed text-stone">
          {pending
            ? 'Stripe has emailed the bank details for your transfer. We will confirm as soon as the funds arrive.'
            : paid
              ? `We have received ${amount}${email ? ` and sent a receipt to ${email}` : ''}. A specialist will contact you within one business day with the next steps.`
              : 'If you completed a payment, a receipt is on its way to your inbox. Our concierge will be in touch shortly.'}
        </p>
        {reference && (
          <p className="mt-6 inline-block border border-sand bg-white px-5 py-3 text-sm">
            Reference <strong className="font-semibold tracking-wide">{reference}</strong>
          </p>
        )}
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn btn-dark">
            Return to the collection
          </Link>
          <a href={`mailto:${SITE.conciergeEmail}`} className="btn btn-outline">
            Email the concierge
          </a>
        </div>
      </div>
    </section>
  );
}
