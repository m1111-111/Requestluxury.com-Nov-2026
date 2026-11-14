import type { Rates } from '@/types';
import { FALLBACK_RATES } from './constants';

export interface RatesResult {
  /** Units of each currency per 1 USD. */
  rates: Rates;
  live: boolean;
  asOf: string | null;
}

const FEED = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP,EUR,CHF,CNY';

/**
 * Live reference rates (European Central Bank data via Frankfurter), refreshed hourly.
 * AED and SAR are dollar-pegged and use their fixed rates. Any failure falls back to
 * the built-in table so pricing never breaks.
 */
export async function getRates(): Promise<RatesResult> {
  try {
    const response = await fetch(FEED, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`FX feed responded ${response.status}`);
    const body = (await response.json()) as { date?: string; rates?: Record<string, number> };
    const live = body.rates ?? {};
    const pick = (code: 'GBP' | 'EUR' | 'CHF' | 'CNY') =>
      typeof live[code] === 'number' && live[code] > 0 ? live[code] : FALLBACK_RATES[code];
    return {
      rates: { ...FALLBACK_RATES, GBP: pick('GBP'), EUR: pick('EUR'), CHF: pick('CHF'), CNY: pick('CNY') },
      live: true,
      asOf: body.date ?? null,
    };
  } catch {
    return { rates: FALLBACK_RATES, live: false, asOf: null };
  }
}
