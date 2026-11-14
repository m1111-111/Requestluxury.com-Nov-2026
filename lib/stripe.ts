import Stripe from 'stripe';
import type { CurrencyCode, Rates } from '@/types';
import { FALLBACK_RATES, SITE } from './constants';

let client: Stripe | null = null;

/** Stripe client, or null until STRIPE_SECRET_KEY is set. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, { appInfo: { name: 'RequestLuxury', url: SITE.url }, maxNetworkRetries: 2 });
  }
  return client;
}

/** True when the configured secret key takes real payments. */
export function isStripeLive(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return key.startsWith('sk_live_') || key.startsWith('rk_live_');
}

export type ChargeCurrency = 'gbp' | 'eur' | 'usd';

/** Currency that listing checkouts are charged in (STRIPE_CHECKOUT_CURRENCY, default gbp). */
export function chargeCurrency(): ChargeCurrency {
  const value = (process.env.STRIPE_CHECKOUT_CURRENCY ?? 'gbp').toLowerCase();
  return value === 'eur' || value === 'usd' ? value : 'gbp';
}

/** Converts a USD amount into the charge currency, in minor units (pence / cents). */
export function usdToMinor(amountUsd: number, currency: ChargeCurrency, rates: Rates = FALLBACK_RATES): number {
  const rate = rates[currency.toUpperCase() as CurrencyCode] ?? 1;
  return Math.round(amountUsd * rate * 100);
}

/** Bank-transfer (customer_balance) settings for each charge currency. */
export function bankTransferOptions(
  currency: ChargeCurrency,
): Stripe.Checkout.SessionCreateParams.PaymentMethodOptions.CustomerBalance {
  if (currency === 'gbp') {
    return { funding_type: 'bank_transfer', bank_transfer: { type: 'gb_bank_transfer' } };
  }
  if (currency === 'eur') {
    return {
      funding_type: 'bank_transfer',
      bank_transfer: { type: 'eu_bank_transfer', eu_bank_transfer: { country: 'DE' } },
    };
  }
  return { funding_type: 'bank_transfer', bank_transfer: { type: 'us_bank_transfer' } };
}

/** Bank transfers are reconciled against a Stripe Customer, so one is found or created first. */
export async function findOrCreateCustomer(stripe: Stripe, email: string, name: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const created = await stripe.customers.create({ email, name });
  return created.id;
}

/**
 * Creates a Checkout Session offering cards and bank transfer. Stripe offers a method
 * only when it is enabled in the account's payment method settings, so bank transfer
 * appears as soon as it is switched on in the Dashboard. If the bank-transfer setup is
 * rejected, the session is created again with cards only, so checkout is never blocked.
 */
export async function createCheckoutSession(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams,
  bankTransfer: { currency: ChargeCurrency; email: string; name: string } | null,
): Promise<Stripe.Checkout.Session> {
  if (bankTransfer) {
    try {
      const customer = await findOrCreateCustomer(stripe, bankTransfer.email, bankTransfer.name);
      const withTransfer: Stripe.Checkout.SessionCreateParams = {
        ...params,
        customer,
        customer_email: undefined,
        allowed_payment_method_types: ['card', 'customer_balance'],
        payment_method_options: { customer_balance: bankTransferOptions(bankTransfer.currency) },
      };
      return await stripe.checkout.sessions.create(withTransfer);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      console.warn(`[stripe] Bank transfer unavailable, retrying with cards only: ${reason}`);
    }
  }
  return stripe.checkout.sessions.create({ ...params, allowed_payment_method_types: ['card'] });
}

export function formatMinor(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  const code = (currency ?? 'gbp').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format((amountMinor ?? 0) / 100);
  } catch {
    return `${((amountMinor ?? 0) / 100).toFixed(2)} ${code}`;
  }
}
