import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { signUpload } from '@/lib/cloudinary';
import type { ManagedDealer } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Issues a short-lived signature for a direct browser upload. Admins and dealers only. */
export async function POST() {
  const context = await getSessionContext();
  if (!context) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  let folder = '';
  if (context.profile?.role === 'admin') {
    folder = 'requestluxury/admin';
  } else {
    const { data } = await context.supabase.rpc('manage_dealers');
    const dealer = ((data ?? []) as ManagedDealer[]).find((item) => item.status !== 'suspended');
    if (dealer) folder = `requestluxury/dealers/${dealer.id}`;
  }
  if (!folder) return NextResponse.json({ error: 'Uploads are available to approved dealers.' }, { status: 403 });

  const signature = signUpload(folder);
  if (!signature) {
    return NextResponse.json({ error: 'Cloudinary is not configured yet. Paste image links instead.' }, { status: 503 });
  }
  return NextResponse.json(signature, { headers: { 'Cache-Control': 'no-store' } });
}
