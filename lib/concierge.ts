import type { LeadType } from '@/types';

export interface ConciergeField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface ConciergeService {
  slug: string;
  navLabel: string;
  title: string;
  eyebrow: string;
  leadType: LeadType;
  summary: string;
  body: string[];
  highlights: Array<{ title: string; text: string }>;
  fields: ConciergeField[];
  messageLabel: string;
  messagePlaceholder: string;
  disclosure?: string;
  image: string;
  /** Shown in the "Concierge & Journal" dropdown. */
  inNav: boolean;
}

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

const villiersId = (process.env.NEXT_PUBLIC_VILLIERS_AFFILIATE_ID || '').replace(/[^\w-]/g, '');

/** Partner links used by the charter tab and the affiliate concierge box. */
export const AFFILIATES = {
  villiersJets: villiersId ? `https://www.villiersjets.com/?id=${encodeURIComponent(villiersId)}` : 'https://www.villiersjets.com/',
  yachtCharter: /^https:\/\//.test(process.env.NEXT_PUBLIC_YACHT_CHARTER_AFFILIATE_URL || '')
    ? (process.env.NEXT_PUBLIC_YACHT_CHARTER_AFFILIATE_URL as string)
    : '',
} as const;

const REGULATED_NOTE =
  'RequestLuxury is an introducer. Regulated services are provided by the authorised specialist we introduce you to, under their own terms, and nothing on this page is financial, legal, tax or immigration advice.';

export const CONCIERGE_SERVICES: ConciergeService[] = [
  {
    slug: 'private-jet-charter',
    navLabel: 'Private Jet Charter',
    title: 'Private Jet Charter',
    eyebrow: 'Fly private',
    leadType: 'charter_request',
    summary: 'One request, the whole market. Light jets for a day trip, long-range aircraft for a multi-city tour.',
    body: [
      'Tell us where you need to be and when. Our aviation desk checks availability across the charter market, including empty-leg positioning flights, and returns options with aircraft type, flight time and an all-in price.',
      'Flying to view an asset listed with us? Mention the listing and we will coordinate the charter with the viewing, ground transport and, where it helps, the partner dealer\'s diary.',
    ],
    highlights: [
      { title: 'Quotes the same day', text: 'Most routes are quoted within a few hours, and urgent departures can often be arranged at very short notice.' },
      { title: 'Every cabin size', text: 'From turboprops and light jets to ultra-long-range aircraft and VIP airliners.' },
      { title: 'One point of contact', text: 'Catering, pets, special luggage and onward helicopter transfers handled in a single conversation.' },
    ],
    fields: [
      { name: 'origin', label: 'From', type: 'text', placeholder: 'London Farnborough', required: true },
      { name: 'destination', label: 'To', type: 'text', placeholder: 'Nice Côte d\'Azur', required: true },
      { name: 'travel_date', label: 'Departure date', type: 'date' },
      { name: 'passengers', label: 'Passengers', type: 'number', placeholder: '4' },
    ],
    messageLabel: 'Anything we should know?',
    messagePlaceholder: 'Return date, preferred aircraft, pets, catering…',
    image: unsplash('1792500285805-8b9b8a9f00e0'),
    inNav: true,
  },
  {
    slug: 'yacht-charter',
    navLabel: 'Yacht Charter',
    title: 'Yacht Charter',
    eyebrow: 'By sea',
    leadType: 'charter_request',
    summary: 'Crewed motor and sailing yachts in the Mediterranean, the Caribbean and further afield.',
    body: [
      'A good charter starts with the right yacht and the right crew. Share your dates, your party and how you like to spend a day on the water, and our charter desk will propose a shortlist with itineraries, not just a brochure.',
      'If you are considering a purchase, a week on a sister ship is the best survey there is. We can arrange a charter on a comparable yacht before you commit.',
    ],
    highlights: [
      { title: 'Curated shortlist', text: 'Three to five yachts matched to your brief, with honest notes on each crew and layout.' },
      { title: 'Itinerary planning', text: 'Berths, restaurant reservations and shore transfers arranged ahead of embarkation.' },
      { title: 'Try before you buy', text: 'Charter fees can be discussed against a later purchase with participating brokers.' },
    ],
    fields: [
      { name: 'destination', label: 'Cruising area', type: 'text', placeholder: 'French Riviera & Corsica', required: true },
      { name: 'travel_date', label: 'Embarkation date', type: 'date' },
      { name: 'nights', label: 'Nights', type: 'number', placeholder: '7' },
      { name: 'passengers', label: 'Guests', type: 'number', placeholder: '8' },
    ],
    messageLabel: 'Tell us about the trip',
    messagePlaceholder: 'Motor or sail, preferred length, children on board, occasions to celebrate…',
    image: unsplash('1779987680720-ca6e1b6fb4b0'),
    inNav: true,
  },
  {
    slug: 'asset-sourcing',
    navLabel: 'Asset Sourcing',
    title: '48-Hour Bespoke Sourcing',
    eyebrow: 'Find it for me',
    leadType: 'bespoke_sourcing',
    summary: 'Tell our global dealer desk the exact watch, car or residence you want, and we will go and find it.',
    body: [
      'Much of the best inventory never reaches a public listing. Describe what you are looking for, down to the reference number, specification or street, and we will circulate your brief privately to the partner dealers best placed to help.',
      'Within 48 hours you receive a written update: what is available, at what price, and with what history. Your identity is not shared with any dealer until you ask us to make an introduction.',
    ],
    highlights: [
      { title: 'A first answer in 48 hours', text: 'A written summary of what the market can offer against your brief.' },
      { title: 'Discreet by default', text: 'Dealers see the brief, not the buyer, until you choose to be introduced.' },
      { title: 'No sourcing fee', text: 'There is no charge to you for a search; partners remunerate us on completion.' },
    ],
    fields: [
      { name: 'category', label: 'Category', type: 'select', options: ['Watch', 'Car', 'Residence', 'Yacht', 'Aircraft', 'Jewel', 'Other'], required: true },
      { name: 'budget_usd', label: 'Budget (USD)', type: 'number', placeholder: '250000' },
      { name: 'timeframe', label: 'Timeframe', type: 'select', options: ['As soon as possible', 'Within 3 months', 'Within 12 months', 'Just exploring'] },
    ],
    messageLabel: 'What should we find?',
    messagePlaceholder: 'e.g. Patek Philippe 5711/1A-010, full set, 2019 or later, unpolished.',
    image: unsplash('1662384197911-e82189f4dc60'),
    inNav: true,
  },
  {
    slug: 'swiss-finishing-schools',
    navLabel: 'Swiss Finishing Schools',
    title: 'Swiss Finishing Schools',
    eyebrow: 'Education concierge',
    leadType: 'education_concierge',
    summary: 'Etiquette, protocol and hospitality programmes on Lake Geneva, arranged around your family\'s calendar.',
    body: [
      'Switzerland\'s finishing-school tradition lives on in intensive courses covering international etiquette, table service, floral art, protocol and the art of hosting. Programmes run from a few days to several weeks and are taught in small groups.',
      'We help families choose the right course and dates, prepare the application, and arrange travel and accommodation nearby, so that the experience is as considered as the curriculum.',
    ],
    highlights: [
      { title: 'Programme selection', text: 'Guidance on course length, language of instruction and suitability by age.' },
      { title: 'Application support', text: 'We prepare and submit the enquiry on your behalf and manage the correspondence.' },
      { title: 'Travel arranged', text: 'Flights, chauffeurs and lakeside accommodation coordinated with term dates.' },
    ],
    fields: [
      { name: 'student_age', label: 'Student age', type: 'number', placeholder: '19' },
      { name: 'preferred_start', label: 'Preferred start', type: 'date' },
      { name: 'duration', label: 'Course length', type: 'select', options: ['One week', 'Two to three weeks', 'Six weeks', 'Not sure yet'] },
    ],
    messageLabel: 'Tell us about the student',
    messagePlaceholder: 'Languages spoken, interests, any dates that must be avoided…',
    disclosure: 'RequestLuxury does not represent any school. We advise independently and admission decisions rest with each institution.',
    image: unsplash('1697193303690-48521aa1b84d'),
    inNav: true,
  },
  {
    slug: 'executive-mbas',
    navLabel: 'Executive MBAs',
    title: 'Executive MBAs',
    eyebrow: 'Education concierge',
    leadType: 'education_concierge',
    summary: 'Independent guidance on leading Executive MBA programmes in Europe, the Gulf and the United States.',
    body: [
      'An Executive MBA is a serious commitment of time as well as capital. We help founders, family-office principals and senior executives compare programmes by format, cohort, location and network, rather than by ranking alone.',
      'Our advisers assist with programme selection, application strategy, essays and interview preparation, and can coordinate the travel that modular programmes demand across several campuses.',
    ],
    highlights: [
      { title: 'Programme shortlist', text: 'A comparison of formats, schedules and total cost for the schools that fit your goals.' },
      { title: 'Application coaching', text: 'Positioning, essays, references and interview practice with experienced advisers.' },
      { title: 'Logistics handled', text: 'Module travel and accommodation planned a year ahead.' },
    ],
    fields: [
      { name: 'current_role', label: 'Current role', type: 'text', placeholder: 'Managing Director, family business' },
      { name: 'preferred_region', label: 'Preferred region', type: 'select', options: ['United Kingdom', 'Continental Europe', 'United States', 'Middle East', 'Asia', 'Open'] },
      { name: 'intake', label: 'Target intake', type: 'text', placeholder: 'Autumn 2027' },
    ],
    messageLabel: 'What do you want from the programme?',
    messagePlaceholder: 'Career goals, schools already considered, constraints on travel…',
    disclosure: 'RequestLuxury does not represent any business school. We advise independently and admission decisions rest with each institution.',
    image: unsplash('1704026437995-a4c44a5ebc1a'),
    inNav: true,
  },
  {
    slug: 'fx-transfers',
    navLabel: 'FX Transfers',
    title: 'International FX Transfers',
    eyebrow: 'Move capital well',
    leadType: 'concierge_service',
    summary: 'On a seven-figure purchase, the exchange rate can matter more than the negotiation.',
    body: [
      'Buying an asset priced in another currency means two decisions: when to exchange, and with whom. A specialist currency provider will often quote a keener rate than a high-street bank on large transfers, and can fix that rate in advance with a forward contract so the cost of your purchase is known on the day you agree it.',
      'We introduce you to an authorised foreign-exchange specialist who will quote against your bank\'s rate. There is no obligation, and a comparison on your actual amount takes a few minutes.',
    ],
    highlights: [
      { title: 'A like-for-like comparison', text: 'See the rate and total cost on your exact amount against your bank\'s quote.' },
      { title: 'Fix the rate ahead', text: 'Forward contracts can lock a rate between agreeing a price and completion.' },
      { title: 'Safeguarded funds', text: 'Client money is handled by the authorised provider under its regulatory safeguards.' },
    ],
    fields: [
      { name: 'sell_currency', label: 'You hold', type: 'select', options: ['GBP', 'USD', 'EUR', 'AED', 'CHF', 'CNY', 'SAR', 'Other'], required: true },
      { name: 'buy_currency', label: 'You need', type: 'select', options: ['USD', 'GBP', 'EUR', 'AED', 'CHF', 'CNY', 'SAR', 'Other'], required: true },
      { name: 'amount', label: 'Approximate amount', type: 'text', placeholder: '2,500,000' },
      { name: 'transfer_date', label: 'Needed by', type: 'date' },
    ],
    messageLabel: 'What is the transfer for?',
    messagePlaceholder: 'Property completion in Dubai, deposit on a yacht…',
    disclosure: REGULATED_NOTE + ' Savings depend on the amount, currency pair and market conditions on the day and are not guaranteed.',
    image: unsplash('1667035100694-ff123f76f17d'),
    inNav: true,
  },
  {
    slug: 'golden-visas',
    navLabel: 'Golden Visas',
    title: 'Golden Visas & Residency by Investment',
    eyebrow: 'Relocation',
    leadType: 'concierge_service',
    summary: 'Residency routes linked to property and investment, explained by licensed advisers.',
    body: [
      'Several countries grant long-term residency to investors, and the rules change often. In the United Arab Emirates, for example, the ten-year Golden Visa is open to property investors above a minimum value set by the authorities, while a number of European programmes have been tightened or closed in recent years.',
      'Because eligibility depends on your nationality, family and source of funds, we do not publish a table of thresholds that may be out of date by the time you read it. Instead we introduce you to a licensed immigration adviser in the relevant jurisdiction, and match their advice to residences on RequestLuxury that qualify.',
    ],
    highlights: [
      { title: 'Current rules, not last year\'s', text: 'Advice from practitioners licensed where you intend to apply.' },
      { title: 'Property that qualifies', text: 'We filter residences by the criteria your adviser confirms.' },
      { title: 'Family included', text: 'Guidance on dependants, schooling and tax residency considerations.' },
    ],
    fields: [
      { name: 'destination_country', label: 'Country of interest', type: 'text', placeholder: 'United Arab Emirates', required: true },
      { name: 'nationality', label: 'Nationality', type: 'text', placeholder: 'British' },
      { name: 'budget_usd', label: 'Investment budget (USD)', type: 'number', placeholder: '1500000' },
      { name: 'family_members', label: 'Family members', type: 'number', placeholder: '4' },
    ],
    messageLabel: 'Tell us about your plans',
    messagePlaceholder: 'Timeline, whether you intend to live there, schools…',
    disclosure: REGULATED_NOTE + ' Programme rules and minimum investment levels are set by each government and can change without notice.',
    image: unsplash('1781795414968-8ece31826420'),
    inNav: true,
  },
  {
    slug: 'asset-insurance',
    navLabel: 'Asset Insurance',
    title: 'Specialist Asset Insurance',
    eyebrow: 'Protect it',
    leadType: 'concierge_service',
    summary: 'Agreed-value cover for watches, jewellery, collector cars, yachts and art, in place before the asset moves.',
    body: [
      'Standard household and motor policies rarely suit high-value assets: single-item limits are low, and cover in transit or abroad is often excluded. Specialist insurers write agreed-value policies that reflect what your asset is actually worth.',
      'We introduce you to an authorised specialist broker who can arrange cover from the moment of purchase, including insured transit from the seller\'s vault to yours.',
    ],
    highlights: [
      { title: 'Agreed value', text: 'The sum insured is settled at inception, supported by a current valuation.' },
      { title: 'Transit worldwide', text: 'Cover can begin the moment title passes, wherever the asset is.' },
      { title: 'One policy or many', text: 'Collections can be scheduled together and updated as you buy and sell.' },
    ],
    fields: [
      { name: 'asset_type', label: 'Asset type', type: 'select', options: ['Watch', 'Jewellery', 'Collector car', 'Yacht', 'Aircraft', 'Art', 'Residence & contents'], required: true },
      { name: 'budget_usd', label: 'Value to insure (USD)', type: 'number', placeholder: '150000' },
      { name: 'country_kept', label: 'Where it will be kept', type: 'text', placeholder: 'United Kingdom' },
    ],
    messageLabel: 'Anything the broker should know?',
    messagePlaceholder: 'Purchase date, storage, existing cover…',
    disclosure: REGULATED_NOTE,
    image: unsplash('1637718231776-382e68dc08df'),
    inNav: false,
  },
];

export function getConciergeService(slug: string): ConciergeService | undefined {
  return CONCIERGE_SERVICES.find((service) => service.slug === slug);
}
