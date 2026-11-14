import type { Metadata } from 'next';
import { ProsePage } from '@/components/layout/ProsePage';
import { FEES, SITE } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Privacy Notice',
  description: 'How RequestLuxury collects, uses and shares personal information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy Notice" updated="14 November 2026">
      <p>
        This notice explains what personal information RequestLuxury (“we”) collects through requestluxury.com, why we use it and who we share it with. You can
        contact us about privacy at <a href={`mailto:${SITE.conciergeEmail}`}>{SITE.conciergeEmail}</a>.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Enquiries.</strong> Your name, email address, phone number, message and the asset or service you asked about, when you request a dossier, open a
          deal room, start a WhatsApp enquiry or use a concierge form.
        </li>
        <li>
          <strong>Accounts.</strong> Your email address, name and sign-in records if you create an account, and your bids if you take part in an auction.
        </li>
        <li>
          <strong>Payments.</strong> Payments are processed by Stripe. We receive confirmation of payment, the amount and your email address, but not your card
          details.
        </li>
        <li>
          <strong>Partners.</strong> Business contact details and listing content supplied by dealers.
        </li>
        <li>
          <strong>Usage.</strong> The country your connection comes from, used to choose a display currency and to report sponsor banner statistics in aggregate.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To respond to your enquiry and introduce you to the relevant dealer or specialist.</li>
        <li>To register introductions for {FEES.protectionMonths} months and keep an audit trail of them.</li>
        <li>To operate accounts, auctions, checkouts and deal rooms, and to prevent fraud and misuse.</li>
        <li>To meet legal and regulatory obligations.</li>
      </ul>
      <p>
        We rely on your request or contract with us, our legitimate interest in running the marketplace, your consent where we ask for it, and legal obligation,
        as the case may be.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>The dealer or specialist concerned</strong>, when we forward your enquiry. For bespoke sourcing, dealers see your brief but not your identity
          until you ask to be introduced.
        </li>
        <li>
          <strong>Service providers</strong> who process data for us: Supabase (database and sign-in), Vercel (hosting), Stripe (payments), Resend (email) and
          Cloudinary (media).
        </li>
        <li>
          <strong>WhatsApp</strong>, if you choose to continue an enquiry there.
        </li>
        <li>Authorities, where the law requires it.</li>
      </ul>
      <p>We do not sell personal information. Some providers process data outside your country; where they do, appropriate safeguards are used.</p>

      <h2>What is stored in your browser</h2>
      <p>
        We store your chosen language and currency, your saved listings and the contact details you have entered, so that you do not need to type them again.
        This information stays on your device. If you sign in, a session cookie keeps you signed in. We do not use advertising trackers.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Enquiry records are kept for the registration period and for as long afterwards as we need them to administer introductions, resolve disputes and meet
        legal obligations. Account information is kept until you ask us to close your account.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete or restrict the use of your information, to object to its use, and to
        receive a copy of it. To exercise these rights, email <a href={`mailto:${SITE.conciergeEmail}`}>{SITE.conciergeEmail}</a>. You may also complain to your
        local data protection authority.
      </p>
    </ProsePage>
  );
}
