import type { SaleMode } from '@/types';
import { PRICE_BANDS, SALE_MODES } from './constants';
import type { ListingFilters, ListingSort } from './data';

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function positive(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const SORTS: ListingSort[] = ['recommended', 'newest', 'price_asc', 'price_desc'];

/** Turns URL search params into safe listing filters, plus the values the filter bar should show. */
export function parseListingSearch(raw: RawSearchParams) {
  const q = one(raw.q).trim().slice(0, 80);
  const min = positive(one(raw.min));
  const max = positive(one(raw.max));
  const modeRaw = one(raw.mode);
  const mode = SALE_MODES.some((item) => item.value === modeRaw) ? (modeRaw as SaleMode) : undefined;
  const sortRaw = one(raw.sort) as ListingSort;
  const sort = SORTS.includes(sortRaw) ? sortRaw : 'recommended';
  const page = Math.min(500, Math.max(1, Math.floor(positive(one(raw.page)) ?? 1)));

  const bandIndex = PRICE_BANDS.findIndex((band) => (band.min ?? undefined) === min && (band.max ?? undefined) === max);

  const filters: ListingFilters = { q: q || undefined, min, max, mode, sort, page, pageSize: 12 };
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (min) params.min = String(min);
  if (max) params.max = String(max);
  if (mode) params.mode = mode;
  if (sort !== 'recommended') params.sort = sort;

  return {
    filters,
    params,
    hasFilters: Boolean(q || min || max || mode),
    filterValues: { q, band: bandIndex >= 0 ? String(bandIndex) : '', mode: mode ?? '', sort },
  };
}
