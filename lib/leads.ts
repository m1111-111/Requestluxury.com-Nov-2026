import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeadReceipt, LeadType } from '@/types';
import { LEAD_TYPES, SITE } from './constants';
import { leadConfirmationEmail, leadNotificationEmail, sendEmail, type LeadEmailContext } from './email';
import { getPublicClient } from './supabase/public';
import { cleanText, isEmail, isUuid } from './validation';

export interface LeadInput {
  leadType: LeadType;
  name: string;
  email: string;
  phone: string;
  message: string;
  listingId: string | null;
  metadata: Record<string, string | number | boolean>;
}

export type ParsedLead = { ok: true; input: LeadInput } | { ok: false; error: string };

/** Validates and normalises a lead submitted by any public form. */
export function parseLeadInput(body: Record<string, unknown>): ParsedLead {
  const leadType = body.lead_type;
  if (typeof leadType !== 'string' || !LEAD_TYPES.includes(leadType as LeadType)) {
    return { ok: false, error: 'Unknown request type.' };
  }
  const name = cleanText(body.name, 160);
  const email = cleanText(body.email, 320).toLowerCase();
  if (name.length < 2) return { ok: false, error: 'Please enter your name.' };
  if (!isEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };

  const listingId = isUuid(body.listing_id) ? body.listing_id : null;

  const metadata: Record<string, string | number | boolean> = {};
  if (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
    for (const [key, value] of Object.entries(body.metadata as Record<string, unknown>).slice(0, 20)) {
      const safeKey = key.replace(/[^a-z0-9_]/gi, '').slice(0, 40);
      if (!safeKey) continue;
      if (typeof value === 'string') metadata[safeKey] = cleanText(value, 300);
      else if (typeof value === 'number' && Number.isFinite(value)) metadata[safeKey] = value;
      else if (typeof value === 'boolean') metadata[safeKey] = value;
    }
  }

  return {
    ok: true,
    input: {
      leadType: leadType as LeadType,
      name,
      email,
      phone: cleanText(body.phone, 40),
      message: cleanText(body.message, 5000),
      listingId,
      metadata,
    },
  };
}

export type LeadResult = { ok: true; receipt: LeadReceipt } | { ok: false; error: string; status: number };

/**
 * Registers the lead through the create_lead() database function, which assigns the
 * RL-YYYY-NNNNN reference, the dealer, the fee tier and the 12-month protection window.
 */
export async function submitLead(input: LeadInput, client?: SupabaseClient | null): Promise<LeadResult> {
  const supabase = client ?? getPublicClient();
  if (!supabase) {
    return { ok: false, status: 503, error: 'Enquiries are not yet connected. Please email ' + SITE.conciergeEmail + '.' };
  }
  const { data, error } = await supabase.rpc('create_lead', {
    p_lead_type: input.leadType,
    p_buyer_name: input.name,
    p_buyer_email: input.email,
    p_buyer_phone: input.phone || null,
    p_message: input.message || null,
    p_listing_id: input.listingId,
    p_metadata: input.metadata,
  });
  if (error || !data) {
    console.error(`[leads] create_lead failed: ${error?.message ?? 'no data returned'}`);
    const unavailable = error?.message?.toLowerCase().includes('not available');
    return {
      ok: false,
      status: unavailable ? 404 : 500,
      error: unavailable
        ? 'This listing is no longer available.'
        : 'We could not register your request. Please try again or email ' + SITE.conciergeEmail + '.',
    };
  }
  return { ok: true, receipt: data as LeadReceipt };
}

/** Notifies the concierge desk and, unless suppressed, confirms to the buyer. */
export async function sendLeadEmails(
  receipt: LeadReceipt,
  context: LeadEmailContext,
  options: { confirmToBuyer?: boolean } = {},
): Promise<void> {
  const jobs = [sendEmail(leadNotificationEmail(receipt, context))];
  if (options.confirmToBuyer !== false) jobs.push(sendEmail(leadConfirmationEmail(receipt, context)));
  await Promise.allSettled(jobs);
}

/** Human-readable metadata rows for the notification email. */
export function metadataDetails(metadata: Record<string, string | number | boolean>): Array<[string, string]> {
  return Object.entries(metadata)
    .filter(([, value]) => value !== '' && value !== false)
    .map(([key, value]) => {
      const label = key.replace(/_/g, ' ');
      return [label.charAt(0).toUpperCase() + label.slice(1), String(value)] as [string, string];
    });
}
