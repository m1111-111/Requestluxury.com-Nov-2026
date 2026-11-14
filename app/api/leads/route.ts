import { NextResponse, after } from 'next/server';
import { SITE } from '@/lib/constants';
import { metadataDetails, parseLeadInput, sendLeadEmails, submitLead } from '@/lib/leads';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getPublicClient } from '@/lib/supabase/public';
import { createServerSupabase } from '@/lib/supabase/server';
import { readJson, whatsappDigits } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Registers a lead from any public form (asset enquiry, WhatsApp click, charter,
 * sourcing, concierge). Responds with the protected reference and, for WhatsApp
 * enquiries, a ready-to-open wa.me link.
 */
export async function POST(request: Request) {
  if (!rateLimit(`leads:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
  }

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  // Honeypot field: people never see it, bots fill it in.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = parseLeadInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.input;

  const supabase = (await createServerSupabase()) ?? getPublicClient();
  const result = await submitLead(input, supabase);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const receipt = result.receipt;

  let listing: { title: string; slug: string } | null = null;
  if (input.listingId && supabase) {
    const { data } = await supabase.from('listings').select('title,slug').eq('id', input.listingId).maybeSingle();
    listing = (data as { title: string; slug: string } | null) ?? null;
  }
  const listingUrl = listing ? `${SITE.url}/listing/${listing.slug}` : null;

  after(() =>
    sendLeadEmails(
      receipt,
      {
        leadType: input.leadType,
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        listingTitle: listing?.title ?? null,
        listingUrl,
        details: metadataDetails(input.metadata),
      },
      { confirmToBuyer: input.leadType !== 'whatsapp_click' },
    ),
  );

  let whatsappUrl: string | null = null;
  if (input.leadType === 'whatsapp_click') {
    const digits = whatsappDigits(receipt.dealer_whatsapp) || SITE.whatsapp;
    if (digits) {
      const text = listing
        ? `Hello, I am enquiring about "${listing.title}" on RequestLuxury (ref ${receipt.reference}). ${listingUrl}`
        : `Hello, I have an enquiry via RequestLuxury (ref ${receipt.reference}).`;
      whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    }
  }

  return NextResponse.json({
    receipt: {
      id: receipt.id,
      reference: receipt.reference,
      protection_expires_at: receipt.protection_expires_at,
      lead_fee_tier_gbp: 0,
      dealer_name: receipt.dealer_name,
      dealer_whatsapp: null,
    },
    whatsapp_url: whatsappUrl,
  });
}
