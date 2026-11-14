import { NextResponse, after } from 'next/server';
import { leadNotificationEmail, sendEmail } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getPublicClient } from '@/lib/supabase/public';
import { createServerSupabase } from '@/lib/supabase/server';
import { cleanText, isEmail, isUuid, readJson } from '@/lib/validation';
import type { DealRoomDoc } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UnlockResult {
  reference: string;
  protection_expires_at: string;
  verified: boolean;
  documents: DealRoomDoc[];
  exact_address: string | null;
}

/**
 * Opens a listing's deal room. The unlock_deal_room() database function registers
 * the protected lead and decides which documents this visitor may receive, so the
 * document links never reach the browser before the lead exists.
 */
export async function POST(request: Request) {
  if (!rateLimit(`dealroom:${clientIp(request)}`, 8, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
  }
  const body = await readJson(request);
  if (!body || !isUuid(body.listing_id)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const name = cleanText(body.name, 160);
  const email = cleanText(body.email, 320).toLowerCase();
  const phone = cleanText(body.phone, 40);
  if (name.length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  if (phone.replace(/\D/g, '').length < 6) return NextResponse.json({ error: 'Please enter a phone number we can verify you on.' }, { status: 400 });

  const supabase = (await createServerSupabase()) ?? getPublicClient();
  if (!supabase) return NextResponse.json({ error: 'The deal room is not connected yet.' }, { status: 503 });

  const { data, error } = await supabase.rpc('unlock_deal_room', {
    p_listing_id: body.listing_id,
    p_buyer_name: name,
    p_buyer_email: email,
    p_buyer_phone: phone,
  });
  if (error || !data) {
    console.error(`[deal-room] unlock failed: ${error?.message ?? 'no data'}`);
    return NextResponse.json({ error: 'We could not open the deal room. Please try again.' }, { status: 500 });
  }
  const result = data as UnlockResult;

  const { data: listing } = await supabase.from('listings').select('title,slug').eq('id', body.listing_id).maybeSingle();
  after(() =>
    sendEmail(
      leadNotificationEmail(
        { id: '', reference: result.reference, protection_expires_at: result.protection_expires_at, lead_fee_tier_gbp: 0, dealer_name: null, dealer_whatsapp: null },
        { leadType: 'deal_room_unlock', name, email, phone, listingTitle: (listing as { title: string } | null)?.title ?? null, message: 'Deal room opened.' },
      ),
    ),
  );

  return NextResponse.json({
    reference: result.reference,
    verified: Boolean(result.verified),
    documents: Array.isArray(result.documents) ? result.documents : [],
    exact_address: result.exact_address ?? null,
  });
}
