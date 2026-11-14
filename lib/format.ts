import type { CurrencyCode, Rates, SpecValue } from '@/types';
import { FALLBACK_RATES } from './constants';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: CurrencyCode, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  let instance = formatters.get(key);
  if (!instance) {
    instance = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
    });
    formatters.set(key, instance);
  }
  return instance;
}

/** Formats an amount that is already in the given currency. */
export function formatMoney(amount: number, currency: CurrencyCode, compact = false): string {
  return formatter(currency, compact).format(Number.isFinite(amount) ? amount : 0);
}

export function convertFromUsd(amountUsd: number, currency: CurrencyCode, rates: Rates = FALLBACK_RATES): number {
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return amountUsd * rate;
}

/** Converts a USD amount into the display currency and formats it. */
export function formatFromUsd(amountUsd: number, currency: CurrencyCode, rates: Rates = FALLBACK_RATES, compact = false): string {
  return formatMoney(convertFromUsd(amountUsd, currency, rates), currency, compact);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' } : { timeZone: 'UTC' }),
  }).format(date);
}

export interface TimeLeft {
  ended: boolean;
  /** Compact label such as "1d 08h", "03h 12m" or "04m 10s". */
  label: string;
  totalSeconds: number;
}

export function timeLeft(endIso: string | null | undefined, nowMs: number): TimeLeft {
  const end = endIso ? new Date(endIso).getTime() : NaN;
  if (!Number.isFinite(end)) return { ended: true, label: '', totalSeconds: 0 };
  const total = Math.max(0, Math.floor((end - nowMs) / 1000));
  if (total <= 0) return { ended: true, label: '00m 00s', totalSeconds: 0 };
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  let label = `${pad(minutes)}m ${pad(seconds)}s`;
  if (days > 0) label = `${days}d ${pad(hours)}h`;
  else if (hours > 0) label = `${pad(hours)}h ${pad(minutes)}m`;
  return { ended: false, label, totalSeconds: total };
}

const SPEC_LABELS: Record<string, string> = {
  interior_sqft: 'Interior',
  plot_sqft: 'Plot',
  year_built: 'Year built',
  mileage_km: 'Mileage',
  power_hp: 'Power',
  length_m: 'Length',
  beam_m: 'Beam',
  cruising_speed_kn: 'Cruising speed',
  max_speed_kn: 'Top speed',
  cruise_speed_kn: 'Cruise speed',
  range_nm: 'Range',
  total_time_hrs: 'Total time',
  case_diameter_mm: 'Case diameter',
  water_resistance_m: 'Water resistance',
  box_papers: 'Box & papers',
  carat_weight: 'Carat weight',
  sapphire_carats: 'Sapphires',
  diamond_carats: 'Diamonds',
  matching_numbers: 'Matching numbers',
};

const SPEC_UNITS: Record<string, string> = {
  interior_sqft: 'sq ft',
  plot_sqft: 'sq ft',
  mileage_km: 'km',
  power_hp: 'hp',
  length_m: 'm',
  beam_m: 'm',
  cruising_speed_kn: 'kn',
  max_speed_kn: 'kn',
  cruise_speed_kn: 'kn',
  range_nm: 'nm',
  total_time_hrs: 'hrs',
  case_diameter_mm: 'mm',
  water_resistance_m: 'm',
  carat_weight: 'ct',
  sapphire_carats: 'ct',
  diamond_carats: 'ct',
};

const PLAIN_NUMBER_KEYS = new Set(['year', 'year_built', 'refit', 'owners']);

export function humanizeKey(key: string): string {
  if (SPEC_LABELS[key]) return SPEC_LABELS[key];
  const text = key.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatSpecValue(key: string, value: SpecValue): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    const text = PLAIN_NUMBER_KEYS.has(key) ? String(value) : formatNumber(value);
    return SPEC_UNITS[key] ? `${text} ${SPEC_UNITS[key]}` : text;
  }
  return String(value);
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function randomSuffix(length = 6): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
