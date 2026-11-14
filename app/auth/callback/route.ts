import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeNextPath } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

/** Completes email confirmation and email-link sign-in, then sends the member on their way. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get('next'));
  const failure = new URL('/sign-in?reason=link', url.origin);

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL('/sign-in?reason=setup', url.origin));

  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(error ? failure : new URL(nextPath, url.origin));
  }

  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return NextResponse.redirect(error ? failure : new URL(nextPath, url.origin));
  }

  return NextResponse.redirect(failure);
}
