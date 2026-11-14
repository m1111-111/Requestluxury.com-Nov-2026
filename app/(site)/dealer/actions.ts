'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionContext } from '@/lib/auth';
import { getRates } from '@/lib/fx';
import { randomSuffix, slugify } from '@/lib/format';
import { importFromFile, type RejectedRow } from '@/lib/importer';
import { friendlyDbError, parseListingForm, uuidOrNull } from '@/lib/listing-form';
import { cleanText, isEmail, isHttpsUrl, isUuid } from '@/lib/validation';
import type { ManagedDealer } from '@/types';

export interface DealerActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export interface DealerImportResult extends DealerActionResult {
  imported: number;
  rejected: RejectedRow[];
}

/** The signed-in member's own dealer profile. Row Level Security enforces the same ownership in the database. */
async function ownDealer(): Promise<{ supabase: SupabaseClient; dealer: ManagedDealer } | { error: string }> {
  const context = await getSessionContext();
  if (!context) return { error: 'Please sign in again.' };
  const { data } = await context.supabase.rpc('manage_dealers');
  const dealer = ((data ?? []) as ManagedDealer[]).find((item) => item.owner_id === context.user.id);
  if (!dealer) return { error: 'No dealer profile is linked to this account.' };
  if (dealer.status === 'suspended') return { error: 'This dealer profile is suspended. Please contact the concierge desk.' };
  return { supabase: context.supabase, dealer };
}

export async function saveDealerListing(raw: unknown): Promise<DealerActionResult> {
  const own = await ownDealer();
  if ('error' in own) return { ok: false, error: own.error };
  const parsed = parseListingForm(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const id = uuidOrNull((raw as { id?: string | null }).id);
  const { error } = id
    ? await own.supabase.from('listings').update(parsed.row).eq('id', id).eq('dealer_id', own.dealer.id)
    : await own.supabase.from('listings').insert({ ...parsed.row, dealer_id: own.dealer.id, slug: `${slugify(parsed.row.title)}-${randomSuffix()}` });
  if (error) return { ok: false, error: friendlyDbError(error.message) };

  revalidatePath('/dealer');
  return { ok: true, message: 'Saved. Your listing is with our moderators and will be published once approved.' };
}

export async function withdrawDealerListing(id: string): Promise<DealerActionResult> {
  const own = await ownDealer();
  if ('error' in own) return { ok: false, error: own.error };
  if (!isUuid(id)) return { ok: false, error: 'Unknown listing.' };
  const { error } = await own.supabase.from('listings').update({ moderation_status: 'archived' }).eq('id', id).eq('dealer_id', own.dealer.id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Listing withdrawn.' };
}

export async function importDealerListings(formData: FormData): Promise<DealerImportResult> {
  const empty = { imported: 0, rejected: [] as RejectedRow[] };
  const own = await ownDealer();
  if ('error' in own) return { ok: false, error: own.error, ...empty };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a CSV or XML file.', ...empty };
  if (file.size > 2_000_000) return { ok: false, error: 'The file is larger than 2 MB.', ...empty };

  const { rates } = await getRates();
  const parsed = importFromFile(file.name, await file.text(), { defaultVertical: own.dealer.vertical_focus, rates, maxRows: 200 });

  let imported = 0;
  const rejected = [...parsed.rejected];
  for (let index = 0; index < parsed.valid.length; index += 1) {
    const row = parsed.valid[index];
    const { error } = await own.supabase.from('listings').insert({ ...row, dealer_id: own.dealer.id, slug: `${slugify(row.title)}-${randomSuffix()}` });
    if (error) rejected.push({ row: index + 1, title: row.title, reason: friendlyDbError(error.message) });
    else imported += 1;
  }

  revalidatePath('/dealer');
  return { ok: true, imported, rejected: rejected.slice(0, 100), message: `${imported} listings sent for review, ${rejected.length} not imported.` };
}

export async function updateDealerProfile(formData: FormData): Promise<DealerActionResult> {
  const own = await ownDealer();
  if ('error' in own) return { ok: false, error: own.error };

  const email = cleanText(formData.get('contact_email'), 320).toLowerCase();
  const website = cleanText(formData.get('website_url'), 300);
  const feed = cleanText(formData.get('feed_url'), 500);
  if (!isEmail(email)) return { ok: false, error: 'Enter a valid contact email.' };
  if (website && !isHttpsUrl(website)) return { ok: false, error: 'The website must start with https://' };
  if (feed && !isHttpsUrl(feed)) return { ok: false, error: 'The feed URL must start with https://' };

  const { error } = await own.supabase
    .from('dealers')
    .update({
      contact_email: email,
      contact_name: cleanText(formData.get('contact_name'), 160) || null,
      whatsapp_number: cleanText(formData.get('whatsapp_number'), 40) || null,
      website_url: website || null,
      feed_url: feed || null,
      rera_orn_number: cleanText(formData.get('rera_orn_number'), 60) || null,
    })
    .eq('id', own.dealer.id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };

  revalidatePath('/dealer');
  return { ok: true, message: 'Profile updated.' };
}
