import type { Listing, Specs } from '@/types';
import { formatNumber } from './format';

function has(specs: Specs, key: string): boolean {
  return specs[key] !== undefined && specs[key] !== null && specs[key] !== '';
}

function num(specs: Specs, key: string): string {
  const value = specs[key];
  return typeof value === 'number' ? formatNumber(value) : String(value);
}

/** The three facts shown under a card title, chosen per vertical. */
export function cardFacts(listing: Pick<Listing, 'vertical' | 'specs'>): string {
  const s = listing.specs ?? {};
  const parts: string[] = [];
  switch (listing.vertical) {
    case 'residences':
      if (has(s, 'bedrooms')) parts.push(`${s.bedrooms} bed`);
      if (has(s, 'bathrooms')) parts.push(`${s.bathrooms} bath`);
      if (has(s, 'interior_sqft')) parts.push(`${num(s, 'interior_sqft')} sq ft`);
      break;
    case 'supercars':
      if (has(s, 'year')) parts.push(String(s.year));
      if (has(s, 'mileage_km')) parts.push(`${num(s, 'mileage_km')} km`);
      if (has(s, 'power_hp')) parts.push(`${num(s, 'power_hp')} hp`);
      break;
    case 'yachts':
      if (has(s, 'length_m')) parts.push(`${s.length_m} m`);
      if (has(s, 'guests')) parts.push(`${s.guests} guests`);
      if (has(s, 'year')) parts.push(String(s.year));
      break;
    case 'aviation':
      if (has(s, 'year')) parts.push(String(s.year));
      if (has(s, 'passengers')) parts.push(`${s.passengers} seats`);
      if (has(s, 'range_nm')) parts.push(`${num(s, 'range_nm')} nm`);
      break;
    case 'horology':
      if (has(s, 'reference')) parts.push(`Ref. ${s.reference}`);
      if (has(s, 'year')) parts.push(String(s.year));
      if (has(s, 'box_papers')) parts.push(String(s.box_papers));
      break;
    case 'jewelry':
      if (has(s, 'main_stone')) parts.push(String(s.main_stone));
      if (has(s, 'carat_weight')) parts.push(`${s.carat_weight} ct`);
      if (has(s, 'metal')) parts.push(String(s.metal));
      break;
  }
  if (parts.length === 0) {
    for (const [key, value] of Object.entries(s).slice(0, 3)) {
      if (value !== null && value !== '' && typeof value !== 'boolean') parts.push(`${String(value)}${typeof value === 'number' ? ` ${key.replace(/_/g, ' ')}` : ''}`);
    }
  }
  return parts.slice(0, 3).join('  ·  ');
}

export function isAuctionLive(listing: Pick<Listing, 'is_auction' | 'auction_end_time'>, nowMs: number): boolean {
  return Boolean(listing.is_auction && listing.auction_end_time && new Date(listing.auction_end_time).getTime() > nowMs);
}
