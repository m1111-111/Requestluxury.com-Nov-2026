import type { Metadata } from 'next';
import Link from 'next/link';
import { DealerPortal } from '@/components/dealer/DealerPortal';
import { requireUser } from '@/lib/auth';
import type { Lead, ManagedDealer, ManagedListing } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dealer Portal',
  robots: { index: false, follow: false },
};

export default async function DealerPage({ searchParams }: { searchParams: Promise<{ payouts?: string }> }) {
  const { supabase, user } = await requireUser('/dealer');
  const { payouts } = await searchParams;

  const { data: dealerRows } = await supabase.rpc('manage_dealers');
  const dealer = ((dealerRows ?? []) as ManagedDealer[]).find((item) => item.owner_id === user.id);

  if (!dealer) {
    return (
      <section className="container-rl flex min-h-[60vh] items-center justify-center py-20">
        <div className="max-w-xl text-center">
          <p className="eyebrow">Dealer portal</p>
          <h1 className="display mt-4 text-4xl md:text-5xl">No dealer profile is linked to this account yet</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-stone">
            Apply as a Founding Partner while signed in and your portal opens here straight away. If you applied before creating this account, ask the concierge
            desk to link your application.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/sell-with-us#apply" className="btn btn-dark">
              Apply as a Founding Partner
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact the concierge
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const [{ data: listings }, { data: leads }] = await Promise.all([
    supabase.rpc('manage_listings').eq('dealer_id', dealer.id).order('updated_at', { ascending: false }).limit(500),
    supabase
      .from('leads')
      .select('*, listing:listings(id,title,slug,vertical,public_price_usd)')
      .eq('dealer_id', dealer.id)
      .eq('admin_status', 'forwarded_to_dealer')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const payoutsNotice =
    payouts === 'done'
      ? 'Thank you. Stripe is reviewing your payout details; sales will be paid out to your account once Stripe confirms it.'
      : payouts === 'retry'
        ? 'Stripe onboarding was not completed. Open “Profile, plan & payouts” to continue where you left off.'
        : null;

  return (
    <section className="container-rl py-12 md:py-16">
      <DealerPortal dealer={dealer} listings={(listings ?? []) as ManagedListing[]} leads={(leads ?? []) as unknown as Lead[]} payoutsNotice={payoutsNotice} />
    </section>
  );
}
