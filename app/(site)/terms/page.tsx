import type { Metadata } from 'next';
import { ProsePage } from '@/components/layout/ProsePage';
import { FEES, SITE } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The terms that apply to using the RequestLuxury marketplace, auctions and concierge services.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  const fee = (FEES.buyerServiceFeeRate * 100).toFixed(1);
  const premium = Math.round(FEES.auctionPremiumRate * 100);
  return (
    <ProsePage eyebrow="Legal" title="Terms of Use" updated="14 November 2026">
      <p>
        These terms govern your use of requestluxury.com (the “Platform”), operated by RequestLuxury (“we”, “us”). By using the Platform you agree to them. If you
        do not agree, please do not use the Platform.
      </p>

      <h2>1. What the Platform is</h2>
      <p>
        RequestLuxury is a marketplace that presents assets offered by independent dealers, brokers and agencies (“Partners”) and introduces prospective buyers to
        them. Unless we state otherwise in writing, we do not own the assets listed, we are not the seller, and we are not a party to any contract of sale between
        a buyer and a Partner.
      </p>
      <p>Listings marked “Showcase” are illustrative examples and are not available for purchase.</p>

      <h2>2. Listings and information</h2>
      <p>
        Listing content is supplied by Partners. We moderate listings before publication but cannot verify every statement, and we give no warranty as to the
        accuracy, condition, title, provenance or availability of any asset. Prices shown in currencies other than the listing currency are converted at
        indicative rates for convenience only.
      </p>
      <p>You are responsible for your own due diligence, including independent legal advice, inspections, surveys and valuations, before committing to a purchase.</p>

      <h2>3. Enquiries and registered introductions</h2>
      <p>
        When you submit an enquiry we register it with a reference and may pass your details to the relevant Partner. The introduction is registered for{' '}
        {FEES.protectionMonths} months. A registration is not an offer, a reservation or an obligation to buy or sell.
      </p>

      <h2>4. Residences</h2>
      <p>
        Property is offered by licensed agents and sold by private treaty. We do not provide estate agency, legal, tax or immigration advice, and we charge buyers
        no fee on property. Regulatory requirements in the property&apos;s jurisdiction apply to the transaction.
      </p>

      <h2>5. Online purchases, deposits and fees</h2>
      <p>
        Where a listing offers online checkout, payment is processed by Stripe. A Buyer&apos;s Service Fee of {fee}% is added to purchases made through the Platform and
        shown before payment. A hold deposit asks the Partner to reserve the asset for the period stated on the listing; it is credited against the purchase
        price, or refunded if you decide not to proceed within that period or if the asset does not match its description.
      </p>
      <p>Your statutory rights as a consumer, where they apply, are not affected.</p>

      <h2>6. Auctions</h2>
      <p>
        Bidding is open to verified account holders. Each bid is a binding offer to buy at that price. A bid placed in the final two minutes extends the auction
        by two minutes. If you are the highest bidder when the auction closes and any reserve has been met, you agree to pay the hammer price plus a Winning
        Bidder Premium of {premium}%. We may cancel a bid or an auction where we reasonably suspect error, fraud or manipulation.
      </p>

      <h2>7. Concierge and partner services</h2>
      <p>
        Charter, foreign exchange, insurance, education and residency services are provided by third parties under their own terms. We act as an introducer and
        may receive a referral fee. Regulated services are provided only by the authorised firm to which you are introduced.
      </p>

      <h2>8. Accounts and acceptable use</h2>
      <p>
        Keep your sign-in details secure and give accurate information. You must not misuse the Platform, including by scraping it, interfering with its
        operation, submitting false enquiries or bids, or attempting to bypass a Partner&apos;s obligations in respect of a registered introduction.
      </p>

      <h2>9. Partners</h2>
      <p>
        Partners are additionally bound by the partner agreement, which covers listing standards, introduction and referral fees, and the {FEES.protectionMonths}
        -month registration period.
      </p>

      <h2>10. Liability</h2>
      <p>
        Nothing in these terms limits liability that cannot be limited by law. Subject to that, we are not liable for losses arising from a transaction between
        you and a Partner or third-party provider, or for indirect or consequential loss.
      </p>

      <h2>11. Changes and contact</h2>
      <p>
        We may update these terms from time to time; the date above shows the latest version. Questions about them can be sent to{' '}
        <a href={`mailto:${SITE.conciergeEmail}`}>{SITE.conciergeEmail}</a>.
      </p>
    </ProsePage>
  );
}
