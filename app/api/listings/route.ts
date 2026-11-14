import { NextResponse } from 'next/server';
import { getListingsByIds } from '@/lib/data';
import { isUuid } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns approved listings by id, for the visitor's saved shortlist. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('ids') ?? '';
  const ids = raw.split(',').filter(isUuid).slice(0, 60);
  const listings = await getListingsByIds(ids);
  const order = new Map(ids.map((id, index) => [id, index]));
  listings.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return NextResponse.json({ listings }, { headers: { 'Cache-Control': 'private, max-age=30' } });
}
