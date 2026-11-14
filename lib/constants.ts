import type { CurrencyCode, LanguageCode, LeadType, Rates, SaleMode, Vertical } from '@/types';

export const SITE = {
  name: 'RequestLuxury',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://requestluxury.com').replace(/\/+$/, ''),
  tagline: 'A World Beyond',
  description:
    'A global luxury marketplace and private auction house for residences, supercars, yachts, aviation, horology and jewelry, with a private concierge for charter, sourcing and relocation.',
  conciergeEmail: 'concierge@requestluxury.com',
  /** Digits only, international format. Empty when not configured. */
  whatsapp: (process.env.NEXT_PUBLIC_CONCIERGE_WHATSAPP || '').replace(/\D/g, ''),
} as const;

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

export interface VerticalInfo {
  slug: Vertical;
  label: string;
  singular: string;
  /** Minimum listing price in USD, mirrored by the listings_price_floor constraint. */
  priceFloorUsd: number;
  blurb: string;
  intro: string;
  image: string;
}

export const VERTICALS: VerticalInfo[] = [
  {
    slug: 'residences',
    label: 'Residences',
    singular: 'Residence',
    priceFloorUsd: 450_000,
    blurb: 'Waterfront villas, penthouses and estates',
    intro:
      'Prime residences presented by licensed agencies in Dubai, London, New York, the Riviera and beyond. Every enquiry is registered and introduced privately to the listing agent.',
    image: unsplash('1781795414968-8ece31826420'),
  },
  {
    slug: 'supercars',
    label: 'Supercars',
    singular: 'Supercar',
    priceFloorUsd: 50_000,
    blurb: 'Modern hypercars and concours classics',
    intro:
      'Low-mileage supercars and blue-chip classics from specialist dealers, with documented histories, refundable hold deposits and timed online auctions.',
    image: unsplash('1777965758053-d6e0b6fef4ce'),
  },
  {
    slug: 'yachts',
    label: 'Yachts',
    singular: 'Yacht',
    priceFloorUsd: 150_000,
    blurb: 'Motor yachts, explorers and sailing classics',
    intro:
      'Motor yachts, explorers and sailing yachts offered through established brokerage houses, with specifications and survey summaries available in each private deal room.',
    image: unsplash('1569263979104-865ab7cd8d13'),
  },
  {
    slug: 'aviation',
    label: 'Aviation',
    singular: 'Aircraft',
    priceFloorUsd: 250_000,
    blurb: 'Business jets, turboprops and helicopters',
    intro:
      'Pre-owned business jets and VIP helicopters from aircraft sales specialists, with equipment lists and maintenance status released to registered buyers.',
    image: unsplash('1684838200815-36eef38f353c'),
  },
  {
    slug: 'horology',
    label: 'Horology',
    singular: 'Timepiece',
    priceFloorUsd: 5_000,
    blurb: 'Authenticated watches, bought or bid',
    intro:
      'Authenticated timepieces from independent dealers: buy outright with insured delivery, reserve with a refundable deposit, or bid in a timed auction.',
    image: unsplash('1662384197911-e82189f4dc60'),
  },
  {
    slug: 'jewelry',
    label: 'Jewelry',
    singular: 'Jewel',
    priceFloorUsd: 5_000,
    blurb: 'Certified stones and signed pieces',
    intro:
      'Certified diamonds, coloured stones and signed jewels from established houses, each supplied with independent laboratory reports or valuations.',
    image: unsplash('1770722272510-ef28c6f57541'),
  },
];

export const VERTICAL_SLUGS = VERTICALS.map((v) => v.slug);

export function getVertical(slug: string | null | undefined): VerticalInfo | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}

export function isVertical(value: unknown): value is Vertical {
  return typeof value === 'string' && VERTICAL_SLUGS.includes(value as Vertical);
}

export const SALE_MODES: Array<{ value: SaleMode; label: string }> = [
  { value: 'inquire_only', label: 'Inquire only' },
  { value: 'direct_buy', label: 'Buy now via Stripe' },
  { value: 'hold_deposit', label: 'Refundable hold deposit' },
  { value: 'timed_auction', label: 'Timed auction' },
];

export const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'GBP', label: 'British Pound' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'CNY', label: 'Chinese Yuan' },
  { code: 'SAR', label: 'Saudi Riyal' },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCY_CODES.includes(value as CurrencyCode);
}

/**
 * Units of each currency per 1 USD. Used when the live feed is unreachable.
 * AED and SAR are pegged to the dollar, so their rates are exact.
 */
export const FALLBACK_RATES: Rates = {
  USD: 1,
  GBP: 0.756,
  EUR: 0.905,
  CHF: 0.838,
  CNY: 6.67,
  AED: 3.6725,
  SAR: 3.75,
};

export const LANGUAGES: Array<{ code: LanguageCode; label: string; native: string; dir: 'ltr' | 'rtl' }> = [
  { code: 'en', label: 'EN', native: 'English', dir: 'ltr' },
  { code: 'fr', label: 'FR', native: 'Français', dir: 'ltr' },
  { code: 'es', label: 'ES', native: 'Español', dir: 'ltr' },
  { code: 'de', label: 'DE', native: 'Deutsch', dir: 'ltr' },
  { code: 'ar', label: 'AR', native: 'العربية', dir: 'rtl' },
  { code: 'zh', label: 'ZH', native: '中文', dir: 'ltr' },
];

/** Commercial terms. Change them here and every page, email and checkout follows. */
export const FEES = {
  /** Buyer's Service Fee added to Stripe "Reserve / Buy" checkouts. */
  buyerServiceFeeRate: 0.035,
  /** Winning Bidder Premium added to the hammer price. */
  auctionPremiumRate: 0.06,
  /** Custom 5-Day Luxury Showroom & AI WhatsApp Build. */
  showroomPriceGbp: 1500,
  showroomDepositGbp: 750,
  /** Default share of the selling broker's commission on a referred sale. */
  referralShareRate: 0.3,
  referralShareMin: 0.25,
  referralShareMax: 0.5,
  /** Months a registered introduction is protected. */
  protectionMonths: 12,
  /** Monthly dealer plans (GBP) billed through Stripe Billing. Founding partners are free. */
  dealerPlansGbp: { pro: 249, elite: 749 } as const,
  /** Card networks decline above this; larger sums are settled by bank transfer through the concierge. */
  maxOnlineChargeMajor: 999_999,
} as const;

/** Tiered lead fee in GBP, mirrored by public.lead_fee_tier_gbp() in the database. */
export function leadFeeTierGbp(priceUsd: number | null | undefined): number {
  if (!priceUsd || priceUsd <= 0) return 0;
  if (priceUsd < 1_000_000) return 25;
  if (priceUsd <= 3_000_000) return 75;
  return 150;
}

/** Bid ladder, mirrored by public.minimum_next_bid() in the database. */
export function minimumNextBid(startingBid: number, currentBid: number, bidCount: number): number {
  if (!bidCount) return Math.max(startingBid, 1);
  let step = 25_000;
  if (currentBid < 10_000) step = 250;
  else if (currentBid < 50_000) step = 500;
  else if (currentBid < 250_000) step = 2_500;
  else if (currentBid < 1_000_000) step = 10_000;
  return currentBid + step;
}

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  asset_inquiry: 'Asset enquiry',
  whatsapp_click: 'WhatsApp enquiry',
  charter_request: 'Charter request',
  bespoke_sourcing: 'Bespoke sourcing',
  deal_room_unlock: 'Deal room unlock',
  b2b_web_build: 'B2B showroom build',
  education_concierge: 'Education concierge',
  concierge_service: 'Concierge service',
};

export const LEAD_TYPES = Object.keys(LEAD_TYPE_LABELS) as LeadType[];

/** Sale modes are disabled for regulated real estate: residences are always enquiry-led. */
export function canCheckoutOnline(vertical: Vertical, saleMode: SaleMode): boolean {
  return vertical !== 'residences' && saleMode !== 'inquire_only';
}

export const PRICE_BANDS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Under $100k', max: 100_000 },
  { label: '$100k – $1M', min: 100_000, max: 1_000_000 },
  { label: '$1M – $5M', min: 1_000_000, max: 5_000_000 },
  { label: '$5M – $20M', min: 5_000_000, max: 20_000_000 },
  { label: '$20M +', min: 20_000_000 },
];
