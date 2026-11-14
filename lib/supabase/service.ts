import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

/**
 * Service-role client. Server only: it bypasses Row Level Security, so it is used
 * solely by the Stripe webhook and Stripe Connect onboarding. Returns null when
 * SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function getServiceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
