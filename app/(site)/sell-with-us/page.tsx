import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { DealerApplicationForm } from '@/components/sell/DealerApplicationForm';
import { ShowroomDeposit } from '@/components/sell/ShowroomDeposit';
import { FEES, VERTICALS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Sell With Us: Founding Partner Syndication & Custom Showrooms',
  description:
    'List luxury inventory free as a Founding Partner with CSV or XML feed syndication, or commission a custom showroom site with an AI WhatsApp assistant, built in five days.',
  alternates: { canonical: '/sell-with-us' },
};

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[15px] leading-relaxed">
      <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-gold" />
      <span>{children}</span>
    </li>
  );
}

export default function SellWithUsPage() {
  const balance = FEES.showroomPriceGbp - FEES.showroomDepositGbp;
  return (
    <>
      <section className="hero-poster relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="hero-lines absolute inset-0 -z-10 opacity-70" />
        <div className="container-rl py-20 md:py-28">
          <p className="eyebrow eyebrow-light">For dealers, brokers & agencies</p>
          <h1 className="display mt-5 max-w-4xl text-5xl md:text-7xl">Put your inventory in front of the world&apos;s private buyers</h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
            Two ways to work with RequestLuxury: syndicate your stock free as a Founding Partner, or have us build your own luxury showroom with an AI WhatsApp
            assistant in five working days.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#apply" className="btn btn-gold">
              Apply as a Founding Partner
            </a>
            <a href="#showroom" className="btn btn-outline-light">
              See the custom showroom
            </a>
          </div>
        </div>
      </section>

      <section className="container-rl grid gap-6 py-16 md:py-24 lg:grid-cols-2">
        {/* Path 1 */}
        <article className="flex flex-col border border-sand bg-white p-8 md:p-10">
          <p className="eyebrow">Path one</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-obsidian">Free Founding Partner Syndication</h2>
          <p className="mt-2 font-serif text-2xl text-gold-deep">£0 to list</p>
          <ul className="mt-7 space-y-3.5 text-charcoal">
            <Bullet>Unlimited listings across six verticals, each reviewed and quality-scored by our moderators.</Bullet>
            <Bullet>Upload by form, CSV spreadsheet or XML feed. We keep your feed URL on file for regular syncs.</Bullet>
            <Bullet>Every buyer introduction arrives with a reference and a 12-month registration certificate.</Bullet>
            <Bullet>1-click WhatsApp enquiries delivered straight to your sales team.</Bullet>
            <Bullet>Optional timed auctions, hold deposits and Stripe checkout with payouts to your own account.</Bullet>
          </ul>
          <p className="mt-7 border-t border-sand pt-5 text-sm leading-relaxed text-stone">
            No listing or subscription fees for Founding Partners. We are paid on results: a tiered introduction fee of £25, £75 or £150 by asset value, or an
            agreed referral share on completed sales, as set out in your partner agreement.
          </p>
          <a href="#apply" className="btn btn-dark mt-8 self-start">
            Apply now
          </a>
        </article>

        {/* Path 2 */}
        <article id="showroom" className="flex scroll-mt-28 flex-col bg-obsidian p-8 text-white md:p-10">
          <p className="eyebrow eyebrow-light">Path two</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight">Custom 5-Day Luxury Showroom & AI WhatsApp Build</h2>
          <p className="mt-2 font-serif text-2xl text-gold">
            £{formatNumber(FEES.showroomPriceGbp)} <span className="text-base text-white/60">one-off</span>
          </p>
          <ul className="mt-7 space-y-3.5 text-white/85">
            <Bullet>A bespoke showroom website on your own domain, designed to the standard of this marketplace.</Bullet>
            <Bullet>Your inventory imported and kept in sync, with multi-currency pricing and enquiry capture.</Bullet>
            <Bullet>An AI WhatsApp assistant that answers enquiries around the clock and hands qualified buyers to your team.</Bullet>
            <Bullet>Delivered in five working days from receipt of your brief and assets.</Bullet>
            <Bullet>Your listings syndicated to RequestLuxury as a Founding Partner at no extra cost.</Bullet>
          </ul>
          <p className="mt-7 border-t border-white/15 pt-5 text-sm leading-relaxed text-white/60">
            Start today with a £{FEES.showroomDepositGbp} deposit by card or bank transfer. The balance of £{balance} is due on delivery. Stripe issues a VAT-ready
            invoice automatically.
          </p>
          <div className="mt-8">
            <ShowroomDeposit />
          </div>
        </article>
      </section>

      <section className="bg-ivory py-16 md:py-24">
        <div className="container-rl grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="eyebrow">How syndication works</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">From feed to first enquiry</h2>
            <ol className="mt-8 space-y-6">
              {[
                ['Apply', 'Tell us about your business and, if you like, attach your inventory. Approval usually takes two business days.'],
                ['We moderate', 'Each listing is checked, scored for quality and published. Edits you make later return to review automatically.'],
                ['Buyers enquire', 'Dossier requests, deal-room unlocks and WhatsApp clicks are registered and forwarded to you with a certificate.'],
                ['You close', 'You complete the sale directly with the buyer. Our fee is due only on the terms of your partner agreement.'],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-5">
                  <span className="font-serif text-3xl leading-none text-gold-deep">0{index + 1}</span>
                  <div>
                    <h3 className="font-serif text-2xl text-obsidian">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-stone">{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 border border-sand bg-white p-6">
              <p className="eyebrow">Minimum listing values</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {VERTICALS.map((vertical) => (
                  <div key={vertical.slug} className="flex justify-between gap-3 border-b border-sand py-1.5">
                    <dt className="text-stone">{vertical.label}</dt>
                    <dd className="font-semibold text-obsidian">${formatNumber(vertical.priceFloorUsd)}+</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-stone">
                Listings below these values are not accepted. Dubai residences must carry a valid Trakheesi permit number.
              </p>
            </div>
          </div>

          <div id="apply" className="scroll-mt-28">
            <p className="eyebrow">Founding Partner application</p>
            <h2 className="mb-8 mt-4 font-serif text-4xl text-obsidian">Apply in two minutes</h2>
            <DealerApplicationForm />
          </div>
        </div>
      </section>
    </>
  );
}
