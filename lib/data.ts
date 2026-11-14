import { cache } from 'react';
import type { Listing, SaleMode, Sponsor, SponsorReport, Vertical } from '@/types';
import { getPublicClient } from './supabase/public';

/** Only columns granted to the public API roles; see supabase/schema.sql section 6. */
export const LISTING_COLUMNS =
  'id,dealer_id,title,slug,vertical,description,public_price_usd,display_currency,price_on_request,sale_mode,' +
  'deposit_amount_usd,country,city,property_status,trakheesi_permit_number,images,video_url,specs,is_auction,' +
  'auction_end_time,starting_bid_usd,current_highest_bid_usd,bid_count,has_reserve,reserve_met,quality_score,' +
  'is_featured,moderation_status,is_showcase,deal_room_preview,created_at,updated_at';

export const DEALER_COLUMNS =
  'id,company_name,slug,vertical_focus,country,city,logo_url,website_url,rera_orn_number,subscription_tier,' +
  'is_verified,status,is_showcase,created_at';

export const SPONSOR_COLUMNS =
  'id,name,slug,headline,body,cta_label,target_url,image_url,verticals,is_active,starts_at,ends_at,created_at';

const LISTING_WITH_DEALER = `${LISTING_COLUMNS},dealer:dealers(${DEALER_COLUMNS})`;

export type ListingSort = 'recommended' | 'newest' | 'price_asc' | 'price_desc';

export interface ListingFilters {
  vertical?: Vertical;
  q?: string;
  min?: number;
  max?: number;
  mode?: SaleMode;
  sort?: ListingSort;
  page?: number;
  pageSize?: number;
}

export interface ListingPage {
  items: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

function logError(scope: string, error: { message?: string } | null) {
  if (error) console.error(`[data:${scope}] ${error.message ?? 'unknown error'}`);
}

export async function getListings(filters: ListingFilters = {}): Promise<ListingPage> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(48, Math.max(1, Math.floor(filters.pageSize ?? 12)));
  const empty: ListingPage = { items: [], total: 0, page, pageSize };

  const supabase = getPublicClient();
  if (!supabase) return empty;

  let query = supabase
    .from('listings')
    .select(LISTING_WITH_DEALER, { count: 'exact' })
    .eq('moderation_status', 'approved');

  if (filters.vertical) query = query.eq('vertical', filters.vertical);
  if (filters.mode) query = query.eq('sale_mode', filters.mode);
  if (typeof filters.min === 'number') query = query.gte('public_price_usd', filters.min);
  if (typeof filters.max === 'number') query = query.lte('public_price_usd', filters.max);
  const term = (filters.q ?? '').trim().slice(0, 80);
  if (term) query = query.textSearch('search_tsv', term, { type: 'websearch', config: 'english' });

  switch (filters.sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'price_asc':
      query = query.order('public_price_usd', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('public_price_usd', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query
        .order('is_featured', { ascending: false })
        .order('quality_score', { ascending: false })
        .order('created_at', { ascending: false });
  }
  query = query.order('id', { ascending: true });

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) {
    logError('getListings', error);
    return empty;
  }
  return { items: (data ?? []) as unknown as Listing[], total: count ?? 0, page, pageSize };
}

export async function getFeaturedListings(limit = 6): Promise<Listing[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_WITH_DEALER)
    .eq('moderation_status', 'approved')
    .order('is_featured', { ascending: false })
    .order('quality_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  logError('getFeaturedListings', error);
  return (data ?? []) as unknown as Listing[];
}

/** Auctions that are still open, soonest to close first. */
export async function getLiveAuctions(limit = 12): Promise<Listing[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_WITH_DEALER)
    .eq('moderation_status', 'approved')
    .eq('is_auction', true)
    .gt('auction_end_time', new Date().toISOString())
    .order('auction_end_time', { ascending: true })
    .limit(limit);
  logError('getLiveAuctions', error);
  return (data ?? []) as unknown as Listing[];
}

export async function getClosedAuctions(limit = 6): Promise<Listing[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_WITH_DEALER)
    .eq('moderation_status', 'approved')
    .eq('is_auction', true)
    .lte('auction_end_time', new Date().toISOString())
    .order('auction_end_time', { ascending: false })
    .limit(limit);
  logError('getClosedAuctions', error);
  return (data ?? []) as unknown as Listing[];
}

export const getListingBySlug = cache(async (slug: string): Promise<Listing | null> => {
  const supabase = getPublicClient();
  if (!supabase || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_WITH_DEALER)
    .eq('slug', slug)
    .eq('moderation_status', 'approved')
    .maybeSingle();
  logError('getListingBySlug', error);
  return (data as unknown as Listing | null) ?? null;
});

export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  const supabase = getPublicClient();
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_WITH_DEALER)
    .in('id', ids.slice(0, 60))
    .eq('moderation_status', 'approved');
  logError('getListingsByIds', error);
  return (data ?? []) as unknown as Listing[];
}

export async function getRelatedListings(listing: Listing, limit = 3): Promise<Listing[]> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_WITH_DEALER)
    .eq('moderation_status', 'approved')
    .eq('vertical', listing.vertical)
    .neq('id', listing.id)
    .order('quality_score', { ascending: false })
    .limit(limit);
  logError('getRelatedListings', error);
  return (data ?? []) as unknown as Listing[];
}

export async function getSitemapListings(): Promise<Array<{ slug: string; updated_at: string }>> {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('listings')
    .select('slug,updated_at')
    .eq('moderation_status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(5000);
  logError('getSitemapListings', error);
  return (data ?? []) as Array<{ slug: string; updated_at: string }>;
}

export async function getVerticalCounts(): Promise<Record<string, number>> {
  const supabase = getPublicClient();
  if (!supabase) return {};
  const { data, error } = await supabase.from('listings').select('vertical').eq('moderation_status', 'approved').limit(5000);
  logError('getVerticalCounts', error);
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ vertical: string }>) counts[row.vertical] = (counts[row.vertical] ?? 0) + 1;
  return counts;
}

/**
 * The sponsor banner for a placement ('home' or a vertical). When several sponsors
 * qualify, they rotate daily so each receives an even share of impressions.
 */
export async function getSponsorFor(placement: Vertical | 'home'): Promise<Sponsor | null> {
  const supabase = getPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('sponsors').select(SPONSOR_COLUMNS).eq('is_active', true).order('created_at');
  logError('getSponsorFor', error);
  const sponsors = ((data ?? []) as unknown as Sponsor[]).filter(
    (s) => placement === 'home' || s.verticals.length === 0 || s.verticals.includes(placement),
  );
  if (sponsors.length === 0) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return sponsors[day % sponsors.length];
}

export async function getSponsorReport(slug: string, key: string | null): Promise<SponsorReport | null> {
  const supabase = getPublicClient();
  if (!supabase || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { data, error } = await supabase.rpc('sponsor_report', { p_slug: slug, p_key: key });
  logError('getSponsorReport', error);
  return (data as SponsorReport | null) ?? null;
}
