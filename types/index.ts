export type Vertical = 'residences' | 'supercars' | 'yachts' | 'aviation' | 'horology' | 'jewelry';
export type SaleMode = 'inquire_only' | 'direct_buy' | 'hold_deposit' | 'timed_auction';
export type ModerationStatus = 'pending_review' | 'approved' | 'rejected' | 'archived';
export type PropertyStatus = 'ready_built' | 'off_plan' | 'not_applicable';
export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'AED' | 'CHF' | 'CNY' | 'SAR';
export type LanguageCode = 'en' | 'fr' | 'es' | 'de' | 'ar' | 'zh';
export type Rates = Record<CurrencyCode, number>;

export type LeadType =
  | 'asset_inquiry'
  | 'whatsapp_click'
  | 'charter_request'
  | 'bespoke_sourcing'
  | 'deal_room_unlock'
  | 'b2b_web_build'
  | 'education_concierge'
  | 'concierge_service';

export type SpecValue = string | number | boolean | null;
export type Specs = Record<string, SpecValue>;

export interface DealRoomTeaser {
  title: string;
  kind: string;
  access: 'registered' | 'verified';
}

export interface DealRoomDoc extends DealRoomTeaser {
  url: string | null;
}

/** The columns every visitor may read. */
export interface Listing {
  id: string;
  dealer_id: string | null;
  title: string;
  slug: string;
  vertical: Vertical;
  description: string;
  public_price_usd: number | null;
  display_currency: CurrencyCode;
  price_on_request: boolean;
  sale_mode: SaleMode;
  deposit_amount_usd: number;
  country: string;
  city: string;
  property_status: PropertyStatus;
  trakheesi_permit_number: string | null;
  images: string[];
  video_url: string | null;
  specs: Specs;
  is_auction: boolean;
  auction_end_time: string | null;
  starting_bid_usd: number;
  current_highest_bid_usd: number;
  bid_count: number;
  has_reserve: boolean;
  reserve_met: boolean;
  quality_score: number;
  is_featured: boolean;
  moderation_status: ModerationStatus;
  is_showcase: boolean;
  deal_room_preview: DealRoomTeaser[];
  created_at: string;
  updated_at: string;
  dealer?: PublicDealer | null;
}

/** The full row, returned to admins and the owning dealer by manage_listings(). */
export interface ManagedListing extends Omit<Listing, 'dealer'> {
  price_usd: number;
  exact_address: string | null;
  deal_room_docs: DealRoomDoc[];
  reserve_price_usd: number;
  admin_notes: string | null;
}

export interface PublicDealer {
  id: string;
  company_name: string;
  slug: string;
  vertical_focus: Vertical | null;
  country: string;
  city: string;
  logo_url: string | null;
  website_url: string | null;
  rera_orn_number: string | null;
  subscription_tier: 'founding_free' | 'pro' | 'elite';
  is_verified: boolean;
  status: 'pending_review' | 'approved' | 'suspended';
  is_showcase: boolean;
  created_at: string;
}

export interface ManagedDealer extends PublicDealer {
  owner_id: string | null;
  contact_email: string;
  contact_name: string | null;
  whatsapp_number: string | null;
  feed_url: string | null;
  stripe_account_id: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'buyer' | 'dealer' | 'admin';
  is_verified_buyer: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  lead_reference_code: string;
  listing_id: string | null;
  dealer_id: string | null;
  lead_type: LeadType;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  lead_fee_tier_gbp: number;
  protection_expires_at: string;
  admin_status: 'new' | 'forwarded_to_dealer' | 'closed_won' | 'archived';
  forwarded_at: string | null;
  created_at: string;
  listing?: { id: string; title: string; slug: string; vertical: Vertical; public_price_usd: number | null } | null;
}

export interface ReferralDeal {
  id: string;
  lead_id: string | null;
  dealer_id: string | null;
  listing_id: string | null;
  deal_type: 'commission_share' | 'lead_fee';
  sale_price_usd: number;
  gross_commission_usd: number;
  referral_share_rate: number;
  referral_payout_usd: number;
  lead_fee_gbp: number;
  status: 'pending' | 'invoiced' | 'paid' | 'void';
  notes: string | null;
  closed_at: string;
  paid_at: string | null;
  created_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  slug: string;
  headline: string;
  body: string | null;
  cta_label: string;
  target_url: string;
  image_url: string | null;
  verticals: string[];
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface ManagedSponsor extends Sponsor {
  contact_email: string | null;
  monthly_fee_gbp: number;
  report_key: string;
}

export interface SponsorCount {
  impressions: number;
  clicks: number;
}

export interface SponsorReport {
  sponsor: { name: string; slug: string; headline: string; is_active: boolean; verticals: string[]; created_at: string };
  totals: SponsorCount;
  last_30_days: SponsorCount;
  by_country: Array<SponsorCount & { country: string }>;
  by_vertical: Array<SponsorCount & { vertical: string }>;
  by_day: Array<SponsorCount & { day: string }>;
}

export interface Payment {
  id: string;
  stripe_session_id: string;
  kind: 'showroom_deposit' | 'hold_deposit' | 'direct_buy' | 'auction_settlement' | 'dealer_subscription';
  listing_id: string | null;
  dealer_id: string | null;
  lead_reference_code: string | null;
  buyer_email: string | null;
  amount_total: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
  created_at: string;
}

export interface AuctionBid {
  bidder_paddle: string;
  bid_amount_usd: number;
  created_at: string;
}

export interface AuctionState {
  listing_id: string;
  starting_bid_usd: number;
  current_highest_bid_usd: number;
  bid_count: number;
  auction_end_time: string;
  minimum_next_bid_usd: number;
  has_reserve: boolean;
  reserve_met: boolean;
  ended: boolean;
  server_time: string;
  is_verified_buyer: boolean;
  my_paddle: string | null;
  i_am_highest: boolean;
  recent_bids: AuctionBid[];
}

export interface LeadReceipt {
  id: string;
  reference: string;
  protection_expires_at: string;
  lead_fee_tier_gbp: number;
  dealer_name: string | null;
  dealer_whatsapp: string | null;
}

/** A listing row ready to insert, produced by the CSV / XML importer and the editors. */
export interface ListingInput {
  title: string;
  vertical: Vertical;
  description: string;
  price_usd: number;
  display_currency: CurrencyCode;
  price_on_request: boolean;
  country: string;
  city: string;
  exact_address: string | null;
  property_status: PropertyStatus;
  trakheesi_permit_number: string | null;
  images: string[];
  video_url: string | null;
  specs: Specs;
}
