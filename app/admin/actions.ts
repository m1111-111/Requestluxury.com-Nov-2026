'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionContext } from '@/lib/auth';
import { FEES, isVertical, leadFeeTierGbp } from '@/lib/constants';
import { registrationCertificateEmail, sendEmail } from '@/lib/email';
import { getRates } from '@/lib/fx';
import { randomSuffix, slugify } from '@/lib/format';
import { importFromCsv, importFromFile, importFromXml, type RejectedRow } from '@/lib/importer';
import { friendlyDbError, parseListingForm, uuidOrNull } from '@/lib/listing-form';
import { fetchPublicText } from '@/lib/safe-fetch';
import { cleanText, isEmail, isHttpsUrl, isUuid, toNumber } from '@/lib/validation';
import type { Lead, ListingInput, ManagedDealer } from '@/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export interface ImportSummary extends ActionResult {
  imported: number;
  rejected: RejectedRow[];
}

/** Every admin action re-checks the caller; the database enforces the same rule through RLS. */
async function admin(): Promise<SupabaseClient> {
  const context = await getSessionContext();
  if (!context || context.profile?.role !== 'admin') throw new Error('Not authorised');
  return context.supabase;
}

function refresh() {
  // Admin edits change what the public sees, so cached pages are rebuilt.
  revalidatePath('/', 'layout');
}

const failed = (error: string): ActionResult => ({ ok: false, error });

// ── Listings ────────────────────────────────────────────────────────────────

export type ListingIntent = 'save' | 'approve' | 'reject' | 'archive';

export async function saveListing(raw: unknown, intent: ListingIntent): Promise<ActionResult> {
  const supabase = await admin();
  const parsed = parseListingForm(raw);
  if (!parsed.ok) return failed(parsed.error);

  const input = raw as { id?: string | null; dealer_id?: string | null; is_featured?: boolean; is_showcase?: boolean; admin_notes?: string };
  const notes = cleanText(input.admin_notes, 2000);
  if (intent === 'reject' && notes.length < 3) return failed('Add a note explaining why the listing is rejected.');

  const record: Record<string, unknown> = {
    ...parsed.row,
    dealer_id: uuidOrNull(input.dealer_id),
    is_featured: Boolean(input.is_featured),
    is_showcase: Boolean(input.is_showcase),
    admin_notes: notes || null,
  };
  if (intent === 'approve') record.moderation_status = 'approved';
  if (intent === 'reject') record.moderation_status = 'rejected';
  if (intent === 'archive') record.moderation_status = 'archived';

  const id = uuidOrNull(input.id);
  const { error } = id
    ? await supabase.from('listings').update(record).eq('id', id)
    : await supabase.from('listings').insert({
        ...record,
        slug: `${slugify(parsed.row.title)}-${randomSuffix()}`,
        moderation_status: (record.moderation_status as string | undefined) ?? 'pending_review',
      });
  if (error) return failed(friendlyDbError(error.message));

  refresh();
  const done = { save: 'Edits saved.', approve: 'Approved and published.', reject: 'Rejected with your note.', archive: 'Archived.' }[intent];
  return { ok: true, message: done };
}

export async function moderateListing(id: string, status: 'approved' | 'rejected' | 'archived' | 'pending_review', note = ''): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id)) return failed('Unknown listing.');
  const cleanNote = cleanText(note, 2000);
  if (status === 'rejected' && cleanNote.length < 3) return failed('Add a note explaining why the listing is rejected.');
  const patch: Record<string, unknown> = { moderation_status: status };
  if (cleanNote) patch.admin_notes = cleanNote;
  const { error } = await supabase.from('listings').update(patch).eq('id', id);
  if (error) return failed(friendlyDbError(error.message));
  refresh();
  return { ok: true };
}

export async function setListingFeatured(id: string, featured: boolean): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id)) return failed('Unknown listing.');
  const { error } = await supabase.from('listings').update({ is_featured: featured }).eq('id', id);
  if (error) return failed(friendlyDbError(error.message));
  refresh();
  return { ok: true };
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id)) return failed('Unknown listing.');
  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) return failed(friendlyDbError(error.message));
  refresh();
  return { ok: true, message: 'Listing deleted.' };
}

async function insertImported(supabase: SupabaseClient, rows: ListingInput[], dealerId: string | null): Promise<{ imported: number; rejected: RejectedRow[] }> {
  let imported = 0;
  const rejected: RejectedRow[] = [];
  const records = rows.map((row) => ({
    ...row,
    dealer_id: dealerId,
    slug: `${slugify(row.title)}-${randomSuffix()}`,
    moderation_status: 'pending_review',
  }));
  for (let start = 0; start < records.length; start += 50) {
    const chunk = records.slice(start, start + 50);
    const { error } = await supabase.from('listings').insert(chunk);
    if (!error) {
      imported += chunk.length;
      continue;
    }
    // One bad row should not sink the batch: retry the chunk row by row.
    for (let offset = 0; offset < chunk.length; offset += 1) {
      const { error: rowError } = await supabase.from('listings').insert(chunk[offset]);
      if (rowError) rejected.push({ row: start + offset + 1, title: chunk[offset].title, reason: friendlyDbError(rowError.message) });
      else imported += 1;
    }
  }
  return { imported, rejected };
}

/** Admin Bulk Importer: a CSV / XML file, or a dealer XML feed URL. Price floors are enforced on every row. */
export async function importListings(formData: FormData): Promise<ImportSummary> {
  const supabase = await admin();
  const dealerId = uuidOrNull(formData.get('dealer_id'));
  const verticalRaw = cleanText(formData.get('default_vertical'), 40);
  const defaultVertical = isVertical(verticalRaw) ? verticalRaw : null;
  const feedUrl = cleanText(formData.get('feed_url'), 500);
  const file = formData.get('file');
  const { rates } = await getRates();
  const options = { defaultVertical, rates, maxRows: 500 };

  let parsed;
  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > 5_000_000) return { ok: false, error: 'The file is larger than 5 MB.', imported: 0, rejected: [] };
      parsed = importFromFile(file.name, await file.text(), options);
    } else if (feedUrl) {
      const body = await fetchPublicText(feedUrl);
      parsed = body.trimStart().startsWith('<') ? importFromXml(body, options) : importFromCsv(body, options);
    } else {
      return { ok: false, error: 'Choose a CSV or XML file, or paste a feed URL.', imported: 0, rejected: [] };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'The feed could not be read.', imported: 0, rejected: [] };
  }

  const inserted = await insertImported(supabase, parsed.valid, dealerId);
  refresh();
  const rejected = [...parsed.rejected, ...inserted.rejected];
  return {
    ok: true,
    imported: inserted.imported,
    rejected: rejected.slice(0, 100),
    message: `${inserted.imported} imported into the review queue, ${rejected.length} rejected.`,
  };
}

// ── Dealers ─────────────────────────────────────────────────────────────────

export async function updateDealer(id: string, patch: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id)) return failed('Unknown dealer.');
  const update: Record<string, unknown> = {};
  if (['pending_review', 'approved', 'suspended'].includes(patch.status as string)) update.status = patch.status;
  if (['founding_free', 'pro', 'elite'].includes(patch.subscription_tier as string)) update.subscription_tier = patch.subscription_tier;
  if (typeof patch.is_verified === 'boolean') update.is_verified = patch.is_verified;
  if (typeof patch.feed_url === 'string') {
    const url = cleanText(patch.feed_url, 500);
    if (url && !isHttpsUrl(url)) return failed('The feed URL must start with https://');
    update.feed_url = url || null;
  }
  if (typeof patch.whatsapp_number === 'string') update.whatsapp_number = cleanText(patch.whatsapp_number, 40) || null;
  if (typeof patch.contact_email === 'string') {
    const email = cleanText(patch.contact_email, 320).toLowerCase();
    if (!isEmail(email)) return failed('Enter a valid contact email.');
    update.contact_email = email;
  }
  if (Object.keys(update).length === 0) return failed('Nothing to change.');

  const { error } = await supabase.from('dealers').update(update).eq('id', id);
  if (error) return failed(friendlyDbError(error.message));

  // A suspended dealer's stock comes off the public site at once.
  if (update.status === 'suspended') {
    await supabase.from('listings').update({ moderation_status: 'archived' }).eq('dealer_id', id).eq('moderation_status', 'approved');
  }
  refresh();
  return { ok: true, message: 'Dealer updated.' };
}

/** Pulls a dealer's XML / CSV feed and adds listings that are not already on file. */
export async function syncDealerFeed(dealerId: string): Promise<ImportSummary> {
  const supabase = await admin();
  const empty = { imported: 0, rejected: [] as RejectedRow[] };
  if (!isUuid(dealerId)) return { ok: false, error: 'Unknown dealer.', ...empty };

  const { data } = await supabase.rpc('manage_dealers');
  const dealer = ((data ?? []) as ManagedDealer[]).find((item) => item.id === dealerId);
  if (!dealer?.feed_url) return { ok: false, error: 'This dealer has no feed URL on file.', ...empty };

  let parsed;
  try {
    const body = await fetchPublicText(dealer.feed_url);
    const { rates } = await getRates();
    const options = { defaultVertical: dealer.vertical_focus, rates, maxRows: 500 };
    parsed = body.trimStart().startsWith('<') ? importFromXml(body, options) : importFromCsv(body, options);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'The feed could not be read.', ...empty };
  }

  const { data: existing } = await supabase.rpc('manage_listings').eq('dealer_id', dealerId).select('title');
  const known = new Set(((existing ?? []) as Array<{ title: string }>).map((row) => row.title.trim().toLowerCase()));
  const fresh = parsed.valid.filter((row) => !known.has(row.title.trim().toLowerCase()));

  const inserted = await insertImported(supabase, fresh, dealerId);
  refresh();
  const rejected = [...parsed.rejected, ...inserted.rejected];
  return {
    ok: true,
    imported: inserted.imported,
    rejected: rejected.slice(0, 100),
    message: `${inserted.imported} new listings queued for review, ${parsed.valid.length - fresh.length} already on file, ${rejected.length} rejected.`,
  };
}

// ── Leads & referral deals ──────────────────────────────────────────────────

export async function setLeadStatus(id: string, status: Lead['admin_status']): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id) || !['new', 'forwarded_to_dealer', 'closed_won', 'archived'].includes(status)) return failed('Invalid request.');
  const { error } = await supabase.from('leads').update({ admin_status: status }).eq('id', id);
  if (error) return failed(friendlyDbError(error.message));
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/** Forward to Partner Dealer & Send 12-Month Registration Certificate. */
export async function forwardLead(leadId: string, dealerId: string): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(leadId) || !isUuid(dealerId)) return failed('Choose the partner dealer to forward this lead to.');

  const { data: dealers } = await supabase.rpc('manage_dealers');
  const dealer = ((dealers ?? []) as ManagedDealer[]).find((item) => item.id === dealerId);
  if (!dealer) return failed('Unknown dealer.');
  if (dealer.status !== 'approved') return failed('Approve this dealer before forwarding leads to them.');

  const { data: updated, error } = await supabase
    .from('leads')
    .update({ dealer_id: dealerId, admin_status: 'forwarded_to_dealer', forwarded_at: new Date().toISOString() })
    .eq('id', leadId)
    .select('*, listing:listings(id,title,slug,vertical,public_price_usd)')
    .maybeSingle();
  if (error || !updated) return failed(friendlyDbError(error?.message));

  const lead = updated as unknown as Lead;
  const sent = await sendEmail(registrationCertificateEmail(lead, dealer, lead.listing?.title ?? null));
  revalidatePath('/admin', 'layout');
  if (!sent.ok) return { ok: true, message: `Lead forwarded, but the certificate email failed (${sent.error ?? 'unknown error'}). Resend it once email is working.` };
  return {
    ok: true,
    message: sent.delivered
      ? `Forwarded to ${dealer.company_name}; certificate ${lead.lead_reference_code} emailed to ${dealer.contact_email}.`
      : `Forwarded to ${dealer.company_name}. Email is not configured yet, so the certificate was written to the server log.`,
  };
}

export interface ReferralDealInput {
  lead_id: string;
  deal_type: 'commission_share' | 'lead_fee';
  sale_price_usd: string | number;
  gross_commission_usd: string | number;
  referral_share_rate: string | number;
  notes: string;
}

/** Converts a closed lead into a referral deal: a share of the broker's commission, or the tiered lead fee. */
export async function createReferralDeal(input: ReferralDealInput): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(input.lead_id)) return failed('Unknown lead.');
  const { data: leadRow } = await supabase.from('leads').select('id,dealer_id,listing_id,lead_fee_tier_gbp').eq('id', input.lead_id).maybeSingle();
  const lead = leadRow as Pick<Lead, 'id' | 'dealer_id' | 'listing_id' | 'lead_fee_tier_gbp'> | null;
  if (!lead) return failed('Unknown lead.');

  const salePrice = Math.max(0, toNumber(input.sale_price_usd) ?? 0);
  const record: Record<string, unknown> = {
    lead_id: lead.id,
    dealer_id: lead.dealer_id,
    listing_id: lead.listing_id,
    deal_type: input.deal_type === 'lead_fee' ? 'lead_fee' : 'commission_share',
    sale_price_usd: salePrice,
    notes: cleanText(input.notes, 2000) || null,
  };

  if (record.deal_type === 'commission_share') {
    const commission = toNumber(input.gross_commission_usd) ?? 0;
    const rate = toNumber(input.referral_share_rate) ?? FEES.referralShareRate;
    if (commission <= 0) return failed("Enter the broker's gross commission in USD.");
    if (rate < FEES.referralShareMin || rate > FEES.referralShareMax) return failed('The referral share must be between 25% and 50%.');
    record.gross_commission_usd = commission;
    record.referral_share_rate = rate;
  } else {
    record.lead_fee_gbp = Number(lead.lead_fee_tier_gbp) > 0 ? Number(lead.lead_fee_tier_gbp) : leadFeeTierGbp(salePrice);
    if (!record.lead_fee_gbp) return failed('Enter the sale price so the lead fee tier can be calculated.');
  }

  const { error } = await supabase.from('referral_deals').upsert(record, { onConflict: 'lead_id' });
  if (error) return failed(friendlyDbError(error.message));
  await supabase.from('leads').update({ admin_status: 'closed_won' }).eq('id', lead.id);
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Referral deal recorded.' };
}

export async function setReferralDealStatus(id: string, status: 'pending' | 'invoiced' | 'paid' | 'void'): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id) || !['pending', 'invoiced', 'paid', 'void'].includes(status)) return failed('Invalid request.');
  const { error } = await supabase
    .from('referral_deals')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return failed(friendlyDbError(error.message));
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

// ── Sponsors ────────────────────────────────────────────────────────────────

export interface SponsorInput {
  id?: string | null;
  name: string;
  slug: string;
  headline: string;
  body: string;
  cta_label: string;
  target_url: string;
  image_url: string;
  verticals: string[];
  is_active: boolean;
  contact_email: string;
  monthly_fee_gbp: string | number;
}

export async function saveSponsor(input: SponsorInput): Promise<ActionResult> {
  const supabase = await admin();
  const name = cleanText(input.name, 120);
  const headline = cleanText(input.headline, 160);
  const target = cleanText(input.target_url, 500);
  const image = cleanText(input.image_url, 1000);
  const contact = cleanText(input.contact_email, 320).toLowerCase();
  if (name.length < 2) return failed('Enter the sponsor name.');
  if (headline.length < 4) return failed('Enter the banner headline.');
  if (!(isHttpsUrl(target) || (target.startsWith('/') && !target.startsWith('//')))) return failed('The destination must be an https:// link or a page on this site such as /concierge.');
  if (image && !isHttpsUrl(image)) return failed('The image link must start with https://');
  if (contact && !isEmail(contact)) return failed('Enter a valid contact email.');

  const record = {
    name,
    slug: slugify(cleanText(input.slug, 80) || name),
    headline,
    body: cleanText(input.body, 600) || null,
    cta_label: cleanText(input.cta_label, 40) || 'Discover more',
    target_url: target,
    image_url: image || null,
    verticals: (Array.isArray(input.verticals) ? input.verticals : []).filter(isVertical),
    is_active: Boolean(input.is_active),
    contact_email: contact || null,
    monthly_fee_gbp: Math.max(0, toNumber(input.monthly_fee_gbp) ?? 0),
  };
  if (!record.slug) return failed('Enter a short link name for the report.');

  const id = uuidOrNull(input.id);
  const { error } = id ? await supabase.from('sponsors').update(record).eq('id', id) : await supabase.from('sponsors').insert(record);
  if (error) return failed(friendlyDbError(error.message));
  refresh();
  return { ok: true, message: 'Sponsor saved.' };
}

export async function deleteSponsor(id: string): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id)) return failed('Unknown sponsor.');
  const { error } = await supabase.from('sponsors').delete().eq('id', id);
  if (error) return failed(friendlyDbError(error.message));
  refresh();
  return { ok: true, message: 'Sponsor deleted.' };
}

/** Issues a new private report key, which invalidates the old report link. */
export async function rotateSponsorKey(id: string): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(id)) return failed('Unknown sponsor.');
  const key = crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabase.from('sponsors').update({ report_key: key }).eq('id', id);
  if (error) return failed(friendlyDbError(error.message));
  revalidatePath('/admin/sponsors');
  return { ok: true, message: 'New report link issued. The previous link no longer works.' };
}

// ── Buyers ──────────────────────────────────────────────────────────────────

export async function setBuyerVerified(userId: string, verified: boolean): Promise<ActionResult> {
  const supabase = await admin();
  if (!isUuid(userId)) return failed('Unknown member.');
  const { error } = await supabase.from('profiles').update({ is_verified_buyer: verified }).eq('id', userId);
  if (error) return failed(friendlyDbError(error.message));
  revalidatePath('/admin/buyers');
  return { ok: true };
}
