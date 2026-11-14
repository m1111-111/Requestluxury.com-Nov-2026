import { NextResponse } from 'next/server';
import { isVertical } from '@/lib/constants';
import { clientIp, rateLimit, visitorCountry } from '@/lib/rate-limit';
import { getPublicClient } from '@/lib/supabase/public';
import { cleanText, isUuid, readJson } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Records a banner impression, stamped server-side with the visitor country (x-vercel-ip-country). */
export async function POST(request: Request) {
  if (!rateLimit(`impression:${clientIp(request)}`, 60, 60_000)) return new NextResponse(null, { status: 204 });
  const body = await readJson(request, 2000);
  if (!body || !isUuid(body.sponsor_id)) return new NextResponse(null, { status: 204 });

  const supabase = getPublicClient();
  if (supabase) {
    const placement = cleanText(body.vertical, 40);
    const path = cleanText(body.path, 300);
    const { error } = await supabase.from('sponsor_events').insert({
      sponsor_id: body.sponsor_id,
      event_type: 'impression',
      country: visitorCountry(request),
      vertical: isVertical(placement) || placement === 'home' ? placement : null,
      path: path.startsWith('/') ? path : null,
    });
    if (error) console.error(`[sponsor-events] ${error.message}`);
  }
  return new NextResponse(null, { status: 204 });
}
