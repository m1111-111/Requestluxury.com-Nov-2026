import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Checkout not completed',
  robots: { index: false, follow: false },
};

export default async function CheckoutCancelledPage({ searchParams }: { searchParams: Promise<{ listing?: string; from?: string }> }) {
  const { listing, from } = await searchParams;
  const back = listing && /^[a-z0-9-]{1,120}$/.test(listing) ? `/listing/${listing}` : from === 'sell-with-us' ? '/sell-with-us#showroom' : '/';

  return (
    <section className="container-rl flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-xl text-center">
        <p className="eyebrow">No payment was taken</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">Checkout was not completed</h1>
        <p className="mt-6 text-[15px] leading-relaxed text-stone">
          Nothing has been charged. Your enquiry is still registered with our concierge, so you can return to pay when you are ready or ask us to arrange a bank transfer instead.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={back} className="btn btn-dark">
            Go back
          </Link>
          <Link href="/contact" className="btn btn-outline">
            Speak to the concierge
          </Link>
        </div>
      </div>
    </section>
  );
}
