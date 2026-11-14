import { NextResponse } from 'next/server';
import { SITE, isVertical } from '@/lib/constants';
import { clientIp, rateLimit, visitorCountry } from '@/lib/rate-limit';
import { getPublicClient } from '@/lib/supabase/public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Records a banner click with the visitor country, then redirects to the sponsor's
 * destination. The destination always comes from the sponsors table, never from the
 * request, so this cannot be used as an open redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('s') ?? '';
  const placement = url.searchParams.get('v') ?? '';
  const home = new URL('/', SITE.url);

  const supabase = getPublicClient();
  if (!supabase || !/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.redirect(home, 302);

  const { data } = await supabase.from('sponsors').select('id,target_url').eq('slug', slug).eq('is_active', true).maybeSingle();
  const sponsor = data as { id: string; target_url: string } | null;
  if (!sponsor) return NextResponse.redirect(home, 302);

  if (rateLimit(`click:${clientIp(request)}`, 30, 60_000)) {
    const { error } = await supabase.from('sponsor_events').insert({
      sponsor_id: sponsor.id,
      event_type: 'click',
      country: visitorCountry(request),
      vertical: isVertical(placement) || placement === 'home' ? placement : null,
      path: null,
    });
    if (error) console.error(`[sponsor-click] ${error.message}`);
  }

  let destination = home;
  try {
    if (sponsor.target_url.startsWith('/') && !sponsor.target_url.startsWith('//')) destination = new URL(sponsor.target_url, SITE.url);
    else if (sponsor.target_url.startsWith('https://')) destination = new URL(sponsor.target_url);
  } catch {
    destination = home;
  }
  const response = NextResponse.redirect(destination, 302);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'origin');
  return response;
}
