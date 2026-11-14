export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readMinutes: number;
  image: string;
  sections: Array<{ heading?: string; paragraphs: string[] }>;
}

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

export const JOURNAL: JournalArticle[] = [
  {
    slug: 'how-a-registered-introduction-protects-you',
    title: 'How a registered introduction protects you',
    excerpt:
      'Every enquiry made through RequestLuxury receives a reference and a twelve-month registration. Here is what that means for buyers and for our partner dealers.',
    category: 'Buying privately',
    publishedAt: '2026-11-10',
    readMinutes: 4,
    image: unsplash('1757862351841-c6f7ac0b0201'),
    sections: [
      {
        paragraphs: [
          'When you ask for a private dossier, unlock a deal room or message a partner on WhatsApp through RequestLuxury, the first thing that happens is invisible: your enquiry is given a reference, such as RL-2026-00042, and registered against the asset and the dealer who holds it.',
          'That reference is the backbone of the way we work. It is quoted on the confirmation you receive, on the certificate we send to the dealer when we introduce you, and on any payment you later make through the platform.',
        ],
      },
      {
        heading: 'What the registration records',
        paragraphs: [
          'A registration states who was introduced, to whom, about which asset, and on what date. It remains in force for twelve months. During that time the dealer has agreed that any transaction with you, for that asset or another from their inventory, is attributable to our introduction.',
          'For you, this means the terms and the service we arrange travel with you. You do not need to re-introduce yourself, and you can always come back to the concierge desk if a conversation stalls or you want a second opinion.',
        ],
      },
      {
        heading: 'What it does not do',
        paragraphs: [
          'A registration is not a reservation and it creates no obligation to buy. It does not take an asset off the market. If you want an asset held while you inspect it, look for listings that offer a refundable hold deposit, or ask the concierge desk to negotiate an exclusivity period on your behalf.',
          'Nor does it replace your own due diligence. For residences we always recommend independent legal advice in the jurisdiction concerned; for vehicles, yachts, aircraft, watches and jewels, an independent inspection or report before funds are released.',
        ],
      },
      {
        heading: 'Your information',
        paragraphs: [
          'We pass your contact details to a dealer only when we forward your enquiry, and only to the dealer concerned. For bespoke sourcing requests, dealers see the brief but not your identity until you ask to be introduced.',
        ],
      },
    ],
  },
  {
    slug: 'trakheesi-permits-explained',
    title: 'Trakheesi permits: what to look for on a Dubai property advert',
    excerpt:
      'Property advertising in Dubai is licensed. A valid permit number on a listing is the quickest sign that the agent is entitled to market it.',
    category: 'Residences',
    publishedAt: '2026-11-06',
    readMinutes: 3,
    image: unsplash('1781795414968-8ece31826420'),
    sections: [
      {
        paragraphs: [
          'Dubai regulates how property is advertised. Before a brokerage markets a property, it obtains an advertising permit through Trakheesi, the permit system operated by the Dubai Land Department. The permit ties the advert to a specific property and to the brokerage authorised to market it.',
          'For a buyer, the permit number is a simple and useful check. It indicates that the listing has been registered with the regulator, which helps to filter out duplicate, outdated or unauthorised adverts.',
        ],
      },
      {
        heading: 'How RequestLuxury applies the rule',
        paragraphs: [
          'A residence located in Dubai cannot be saved on RequestLuxury without a permit number. The requirement is enforced in our database as well as in our submission forms, and our moderators confirm the number before a listing is approved. Approved Dubai residences display the permit as a badge on the listing page.',
          'Partner brokerages also provide their office registration number, which we record against their dealer profile.',
        ],
      },
      {
        heading: 'What you should still do',
        paragraphs: [
          'A permit is evidence that an advert was authorised, not a substitute for due diligence. Verify the permit and the broker through the Dubai Land Department\'s official channels, ask to see the title deed or, for off-plan property, the developer\'s registration, and take independent legal advice before paying a deposit.',
          'Regulations are updated from time to time, so treat this article as an introduction and confirm current requirements with the Dubai Land Department or a licensed conveyancer.',
        ],
      },
    ],
  },
  {
    slug: 'fees-deposits-and-premiums-explained',
    title: 'Fees, hold deposits and the buyer\'s premium, explained',
    excerpt:
      'What you pay, when you pay it and what is refundable when you reserve, buy or bid on RequestLuxury.',
    category: 'How it works',
    publishedAt: '2026-11-03',
    readMinutes: 4,
    image: unsplash('1662384197911-e82189f4dc60'),
    sections: [
      {
        paragraphs: [
          'Listings on RequestLuxury are offered in one of four ways, shown on the card beside the price. Each has its own, deliberately simple, cost structure.',
        ],
      },
      {
        heading: 'Enquiry only',
        paragraphs: [
          'All residences, and many larger assets, are sold by private treaty. There is nothing to pay on the platform: you request the dossier or message the dealer, we register the introduction, and the transaction completes between you, the seller and your advisers. RequestLuxury is remunerated by the partner dealer.',
        ],
      },
      {
        heading: 'Buy now',
        paragraphs: [
          'Watches, jewels and some vehicles can be bought outright through Stripe checkout by card or bank transfer. A Buyer\'s Service Fee of 3.5% is added to the listed price and shown as a separate line before you pay. It covers payment processing, authentication coordination and insured delivery arrangements.',
        ],
      },
      {
        heading: 'Hold deposits',
        paragraphs: [
          'Where a listing offers a hold deposit, paying it asks the dealer to reserve the asset for you for the period stated on the listing while you inspect it. The deposit is credited against the purchase price if you proceed and refunded if you do not, or if the asset does not match its description. The Buyer\'s Service Fee applies only if you complete through the platform.',
        ],
      },
      {
        heading: 'Timed auctions',
        paragraphs: [
          'Bidding is open to verified buyers. If a bid arrives in the final two minutes, the closing time is extended by two minutes, so every bidder has a fair chance to respond. The winning bidder pays the hammer price plus a Winning Bidder Premium of 6%. Where a lot has a reserve that is not met, it does not sell, although we may help the parties reach agreement afterwards.',
        ],
      },
      {
        heading: 'Larger transactions',
        paragraphs: [
          'Card networks limit the size of a single payment. For higher-value purchases the concierge desk provides bank-transfer instructions and, where appropriate, arranges for funds to be held in escrow by a regulated third party until delivery.',
        ],
      },
    ],
  },
];

export function getArticle(slug: string): JournalArticle | undefined {
  return JOURNAL.find((article) => article.slug === slug);
}
