import type { CurrencyCode, DealRoomDoc, PropertyStatus, SaleMode, Specs, Vertical } from '@/types';
import { SALE_MODES, getVertical, isCurrency, isVertical } from './constants';
import { formatNumber } from './format';
import { cleanText, isHttpsUrl, isUuid, toNumber } from './validation';

/** What the listing editor sends to the server. */
export interface ListingFormInput {
  id?: string | null;
  dealer_id?: string | null;
  title: string;
  vertical: string;
  description: string;
  price_usd: string | number;
  display_currency: string;
  price_on_request: boolean;
  sale_mode: string;
  deposit_amount_usd: string | number;
  country: string;
  city: string;
  exact_address: string;
  property_status: string;
  trakheesi_permit_number: string;
  images: string[];
  video_url: string;
  /** Specifications as JSON text, edited directly by admins and dealers. */
  specs: string;
  deal_room_docs: Array<{ title: string; kind: string; access: string; url: string }>;
  auction_end_time: string;
  starting_bid_usd: string | number;
  reserve_price_usd: string | number;
  is_featured?: boolean;
  is_showcase?: boolean;
  admin_notes?: string;
}

/** Columns written to public.listings. */
export interface ListingWrite {
  title: string;
  vertical: Vertical;
  description: string;
  price_usd: number;
  display_currency: CurrencyCode;
  price_on_request: boolean;
  sale_mode: SaleMode;
  deposit_amount_usd: number;
  country: string;
  city: string;
  exact_address: string | null;
  property_status: PropertyStatus;
  trakheesi_permit_number: string | null;
  images: string[];
  video_url: string | null;
  specs: Specs;
  deal_room_docs: DealRoomDoc[];
  auction_end_time: string | null;
  starting_bid_usd: number;
  reserve_price_usd: number;
}

export const DOC_KINDS = ['floorplan', 'specification', 'provenance', 'inspection', 'certificate', 'valuation', 'legal', 'document'] as const;

export type ParsedListing = { ok: true; row: ListingWrite } | { ok: false; error: string };

function isSafeAssetUrl(value: string): boolean {
  return isHttpsUrl(value) || (value.startsWith('/') && !value.startsWith('//') && value.length <= 500);
}

/** Server-side validation shared by the admin editor and the dealer portal. */
export function parseListingForm(raw: unknown): ParsedListing {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Invalid listing.' };
  const input = raw as Partial<ListingFormInput>;
  const fail = (error: string): ParsedListing => ({ ok: false, error });

  const title = cleanText(input.title, 200);
  if (title.length < 3) return fail('Give the listing a title of at least 3 characters.');

  if (!isVertical(input.vertical)) return fail('Choose a category.');
  const vertical = input.vertical;
  const info = getVertical(vertical);

  const description = cleanText(input.description, 20_000);
  if (description.length < 20) return fail('The description needs at least 20 characters.');

  const price = toNumber(input.price_usd);
  if (price === null || price <= 0) return fail('Enter the price in USD.');
  if (info && price < info.priceFloorUsd) {
    return fail(`${info.label} listings start at $${formatNumber(info.priceFloorUsd)}. Enter a price at or above that value.`);
  }
  if (price > 999_999_999_999) return fail('That price is too large.');

  const currency = String(input.display_currency ?? 'USD').toUpperCase();
  if (!isCurrency(currency)) return fail('Choose a display currency.');

  const saleMode = SALE_MODES.find((mode) => mode.value === input.sale_mode)?.value;
  if (!saleMode) return fail('Choose how the asset is sold.');
  if (vertical === 'residences' && saleMode !== 'inquire_only') {
    return fail('Residences are regulated real estate and can only be listed as "Inquire only".');
  }
  const priceOnRequest = Boolean(input.price_on_request);
  if (priceOnRequest && saleMode === 'direct_buy') return fail('A buy-now listing needs a public price. Untick "Price on request".');

  let deposit = 0;
  if (saleMode === 'hold_deposit') {
    deposit = toNumber(input.deposit_amount_usd) ?? 0;
    if (deposit <= 0) return fail('Enter the refundable hold deposit in USD.');
    if (deposit > 99_999_999) return fail('The hold deposit is too large.');
    if (deposit >= price) return fail('The hold deposit must be less than the price.');
  }

  let auctionEnd: string | null = null;
  let startingBid = 0;
  let reserve = 0;
  if (saleMode === 'timed_auction') {
    const end = new Date(String(input.auction_end_time ?? ''));
    if (Number.isNaN(end.getTime())) return fail('Set the date and time the auction closes.');
    auctionEnd = end.toISOString();
    startingBid = toNumber(input.starting_bid_usd) ?? 0;
    if (startingBid <= 0) return fail('Enter the opening bid in USD.');
    reserve = Math.max(0, toNumber(input.reserve_price_usd) ?? 0);
    if (reserve > 0 && reserve < startingBid) return fail('The reserve cannot be lower than the opening bid.');
  }

  const country = cleanText(input.country, 120);
  const city = cleanText(input.city, 120);
  if (!country || !city) return fail('City and country are required.');

  const permit = cleanText(input.trakheesi_permit_number, 60);
  if (vertical === 'residences' && city.toLowerCase() === 'dubai' && !permit) {
    return fail('Dubai residences must show their Trakheesi permit number.');
  }

  const propertyStatus: PropertyStatus =
    vertical !== 'residences' ? 'not_applicable' : input.property_status === 'off_plan' ? 'off_plan' : 'ready_built';

  const images: string[] = [];
  for (const value of Array.isArray(input.images) ? input.images : []) {
    const url = cleanText(value, 1000);
    if (!url) continue;
    if (!isSafeAssetUrl(url)) return fail(`This image link is not a valid https address: ${url.slice(0, 80)}`);
    if (!images.includes(url)) images.push(url);
    if (images.length >= 40) break;
  }

  const videoUrl = cleanText(input.video_url, 500);
  if (videoUrl && !isHttpsUrl(videoUrl)) return fail('The video link must start with https://');

  const specs: Specs = {};
  const specsText = String(input.specs ?? '').trim();
  if (specsText) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(specsText);
    } catch {
      return fail('Specifications must be valid JSON, for example {"year": 2023, "colour": "Black"}.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('Specifications must be a JSON object of name and value pairs.');
    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.length > 40) return fail('Use at most 40 specifications.');
    for (const [key, value] of entries) {
      const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
      if (!cleanKey) continue;
      if (typeof value === 'string') specs[cleanKey] = cleanText(value, 300);
      else if (typeof value === 'number' && Number.isFinite(value)) specs[cleanKey] = value;
      else if (typeof value === 'boolean') specs[cleanKey] = value;
      else if (value !== null) return fail(`Specification "${key}" must be text, a number or true/false.`);
    }
  }

  const docs: DealRoomDoc[] = [];
  for (const doc of Array.isArray(input.deal_room_docs) ? input.deal_room_docs.slice(0, 12) : []) {
    const docTitle = cleanText(doc?.title, 120);
    const url = cleanText(doc?.url, 1000);
    if (!docTitle && !url) continue;
    if (!docTitle) return fail('Every deal room document needs a title.');
    if (!isSafeAssetUrl(url)) return fail(`The link for "${docTitle}" must be an https address.`);
    docs.push({
      title: docTitle,
      kind: (DOC_KINDS as readonly string[]).includes(doc.kind) ? doc.kind : 'document',
      access: doc.access === 'verified' ? 'verified' : 'registered',
      url,
    });
  }

  return {
    ok: true,
    row: {
      title,
      vertical,
      description,
      price_usd: Math.round(price * 100) / 100,
      display_currency: currency,
      price_on_request: priceOnRequest,
      sale_mode: saleMode,
      deposit_amount_usd: Math.round(deposit * 100) / 100,
      country,
      city,
      exact_address: cleanText(input.exact_address, 300) || null,
      property_status: propertyStatus,
      trakheesi_permit_number: permit || null,
      images,
      video_url: videoUrl || null,
      specs,
      deal_room_docs: docs,
      auction_end_time: auctionEnd,
      starting_bid_usd: Math.round(startingBid * 100) / 100,
      reserve_price_usd: Math.round(reserve * 100) / 100,
    },
  };
}

/** Turns a database error into something an editor can act on. */
export function friendlyDbError(message: string | undefined): string {
  const text = message ?? '';
  if (text.includes('listings_price_floor')) return 'The price is below the minimum for this category.';
  if (text.includes('listings_dubai_trakheesi_required')) return 'Dubai residences must show their Trakheesi permit number.';
  if (text.includes('listings_residences_inquire_only')) return 'Residences can only be listed as "Inquire only".';
  if (text.includes('listings_auction_needs_terms')) return 'A timed auction needs a closing time and an opening bid.';
  if (text.includes('listings_hold_deposit_needs_amount')) return 'A hold-deposit listing needs a deposit amount.';
  if (text.includes('listings_slug_key') || text.includes('duplicate key')) return 'A record with the same name already exists. Change the title or slug and try again.';
  if (text.includes('Auction terms cannot be changed')) return 'Auction terms cannot be changed once bidding has started.';
  if (text.includes('row-level security') || text.includes('permission denied')) return 'You do not have permission to make this change.';
  if (text.includes('referral_share_rate')) return 'The referral share must be between 25% and 50%.';
  return 'The change could not be saved. Please check the details and try again.';
}

export function uuidOrNull(value: unknown): string | null {
  return isUuid(value) ? value : null;
}
