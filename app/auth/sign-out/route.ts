import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Signs the member out. POST only, so a link or prefetch can never end a session. */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), 303);
}
