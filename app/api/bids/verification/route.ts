import { NextResponse, after } from 'next/server';
import { sendLeadEmails, submitLead } from '@/lib/leads';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createServerSupabase } from '@/lib/supabase/server';
import { cleanText, isUuid, readJson } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A signed-in member asks the concierge to verify them as a bidder. */
export async function POST(request: Request) {
  if (!rateLimit(`verify:${clientIp(request)}`, 4, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }
  const body = await readJson(request);
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Accounts are not connected yet.' }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const name = cleanText((profile as { full_name: string | null } | null)?.full_name, 160) || user.email.split('@')[0];
  const listingId = isUuid(body?.listing_id) ? (body?.listing_id as string) : null;

  const input = {
    leadType: 'asset_inquiry' as const,
    name,
    email: user.email,
    phone: cleanText(body?.phone, 40),
    message: 'Please verify my account so that I can bid.',
    listingId,
    metadata: { intent: 'bidder_verification', user_id: user.id },
  };
  const result = await submitLead(input, supabase);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  after(() =>
    sendLeadEmails(result.receipt, {
      leadType: input.leadType,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      details: [['Action', 'Verify this buyer in /admin/buyers']],
    }),
  );
  return NextResponse.json({ reference: result.receipt.reference });
}
