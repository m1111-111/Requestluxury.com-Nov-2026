import { NextResponse } from 'next/server';
import { getRates } from '@/lib/fx';

export const revalidate = 3600;

/** Live display rates (units per 1 USD) for the seven supported currencies. */
export async function GET() {
  const result = await getRates();
  return NextResponse.json(
    { base: 'USD', ...result },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
