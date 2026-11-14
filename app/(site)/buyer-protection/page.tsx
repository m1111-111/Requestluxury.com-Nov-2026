import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, FileLock2, Gavel, ShieldCheck } from 'lucide-react';
import { FEES } from '@/lib/constants';

export const metadata: Metadata = {
  title: '12-Month Buyer Protection',
  description:
    'Every enquiry on RequestLuxury is registered with a reference and protected for twelve months. How registration, deal rooms, deposits and auctions work for buyers.',
  alternates: { canonical: '/buyer-protection' },
};

export default function BuyerProtectionPage() {
  const fee = (FEES.buyerServiceFeeRate * 100).toFixed(1);
  const premium = Math.round(FEES.auctionPremiumRate * 100);
  const points = [
    {
      icon: ShieldCheck,
      title: 'A registered introduction',
      text: `Each enquiry receives a reference such as RL-2026-00042 and is registered against the asset and the dealer for ${FEES.protectionMonths} months. The dealer receives a certificate naming you as our introduction, so the terms we arrange stay with you.`,
    },
    {
      icon: BadgeCheck,
      title: 'Vetted partners, moderated listings',
      text: 'Dealers apply to join and are reviewed before they can publish. Every listing, and every later edit, passes through our moderators. Dubai residences are not accepted without a Trakheesi permit number.',
    },
    {
      icon: FileLock2,
      title: 'Private deal rooms',
      text: 'Floor plans, specifications and provenance are released when you register your interest. More sensitive documents are released once we have verified you as a buyer.',
    },
    {
      icon: Gavel,
      title: 'Clear, limited fees',
      text: `Residences carry no buyer fee. Online purchases add a ${fee}% Buyer's Service Fee, shown before you pay. Hold deposits are refundable. Auction winners pay the hammer price plus a ${premium}% premium.`,
    },
  ];
  return (
    <>
      <section className="bg-obsidian text-white">
        <div className="container-rl py-20 md:py-28">
          <p className="eyebrow eyebrow-light">Buyer protection</p>
          <h1 className="display mt-5 max-w-4xl text-5xl md:text-7xl">Registered, referenced and protected for {FEES.protectionMonths} months</h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
            Buying something rare means trusting people you have not met. Here is exactly what RequestLuxury does to deserve that trust, and what remains your
            responsibility.
          </p>
        </div>
      </section>

      <section className="container-rl grid gap-px border-sand bg-sand py-px sm:grid-cols-2 md:my-20 md:border">
        {points.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-white p-8 md:p-10">
            <Icon aria-hidden="true" className="h-8 w-8 text-gold-deep" strokeWidth={1.25} />
            <h2 className="mt-5 font-serif text-3xl text-obsidian">{title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-stone">{text}</p>
          </div>
        ))}
      </section>

      <section className="container-rl max-w-3xl pb-20">
        <div className="prose-rl text-[1.02rem]">
          <h2>What protection does not mean</h2>
          <p>
            RequestLuxury introduces buyers and sellers; we are not a party to your contract of sale and we do not hold title to the assets listed. A registration
            is not a reservation, a guarantee of condition, or a substitute for your own due diligence.
          </p>
          <p>
            Before you release funds we recommend independent legal advice for property, and an independent inspection, survey or laboratory report for vehicles,
            yachts, aircraft, watches and jewels. Our concierge can arrange any of these for you.
          </p>
          <h2>If something goes wrong</h2>
          <p>
            Tell us at once, quoting your reference. We will raise the matter with the dealer, and a partner who fails to honour a registered introduction or a
            refundable deposit is removed from the marketplace. Payments made through Stripe also carry the protections of your card issuer or bank.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/contact" className="btn btn-dark">
            Speak to the concierge desk
          </Link>
          <Link href="/journal/fees-deposits-and-premiums-explained" className="btn btn-outline">
            Fees explained
          </Link>
        </div>
      </section>
    </>
  );
}
