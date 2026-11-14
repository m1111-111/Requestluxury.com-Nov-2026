import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PRIMARY_ORIGIN, isFeederHost } from './config/feeder-domains.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** First-visit display currency, chosen from the visitor country reported by Vercel. */
const EUROZONE = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'MC',
]);

function currencyForCountry(country: string | null): string | null {
  if (!country) return null;
  const code = country.toUpperCase();
  if (code === 'GB') return 'GBP';
  if (code === 'AE') return 'AED';
  if (code === 'SA') return 'SAR';
  if (code === 'CH' || code === 'LI') return 'CHF';
  if (code === 'CN') return 'CNY';
  if (EUROZONE.has(code)) return 'EUR';
  return 'USD';
}

function isProtected(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export async function middleware(request: NextRequest) {
  // 1. Feeder domains → permanent 301 redirect to the primary hub.
  if (isFeederHost(request.headers.get('host'))) {
    return NextResponse.redirect(`${PRIMARY_ORIGIN}/`, 301);
  }

  const { pathname, search } = request.nextUrl;
  const needsAdmin = isProtected(pathname, '/admin');
  const needsUser = needsAdmin || isProtected(pathname, '/dealer') || isProtected(pathname, '/account');

  let response = NextResponse.next({ request });

  // 2. /admin/* is reserved for profiles.role = 'admin'; /dealer and /account need a signed-in member.
  if (needsUser) {
    const signIn = (reason: string) => {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.search = `?next=${encodeURIComponent(pathname + search)}&reason=${reason}`;
      const redirect = NextResponse.redirect(url);
      // Keep any refreshed session cookies on the redirect.
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    };

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return signIn('setup');
    }

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return signIn('auth');
    }

    if (needsAdmin) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'admin') {
        return signIn('admin');
      }
    }

    response.headers.set('Cache-Control', 'private, no-store');
  }

  // 3. Remember a sensible display currency for first-time visitors.
  if (!request.cookies.has('rl_ccy')) {
    const currency = currencyForCountry(request.headers.get('x-vercel-ip-country'));
    if (currency) {
      response.cookies.set('rl_ccy', currency, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Every route except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|pdf|csv|xml|txt|css|js|map|woff|woff2)$).*)',
  ],
};
