import { NextResponse, after } from 'next/server';
import { isVertical } from '@/lib/constants';
import { dealerApplicationEmail, sendEmail } from '@/lib/email';
import { getRates } from '@/lib/fx';
import { importFromFile, type ImportResult } from '@/lib/importer';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getPublicClient } from '@/lib/supabase/public';
import { createServerSupabase } from '@/lib/supabase/server';
import { cleanText, isEmail, isHttpsUrl } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 2_000_000;

/**
 * Founding Partner application with an optional inventory file (CSV or XML).
 * The dealer and any valid listings are created together, all pending review.
 */
export async function POST(request: Request) {
  if (!rateLimit(`apply:${clientIp(request)}`, 4, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many applications from this connection. Please try again later.' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 });
  }
  const field = (name: string, max: number) => cleanText(form.get(name), max);
  if (field('website', 200) !== '') return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 });

  const vertical = field('vertical_focus', 40);
  const application: Record<string, string> = {
    company_name: field('company_name', 160),
    contact_name: field('contact_name', 160),
    contact_email: field('contact_email', 320).toLowerCase(),
    whatsapp_number: field('whatsapp_number', 40),
    website_url: field('website_url', 300),
    vertical_focus: isVertical(vertical) ? vertical : '',
    country: field('country', 120),
    city: field('city', 120),
    rera_orn_number: field('rera_orn_number', 60),
    feed_url: field('feed_url', 500),
  };

  if (application.company_name.length < 2) return NextResponse.json({ error: 'Please enter your company name.' }, { status: 400 });
  if (!isEmail(application.contact_email)) return NextResponse.json({ error: 'Please enter a valid contact email.' }, { status: 400 });
  if (!application.country || !application.city) return NextResponse.json({ error: 'Please enter your city and country.' }, { status: 400 });
  if (!application.vertical_focus) return NextResponse.json({ error: 'Please choose your main category.' }, { status: 400 });
  if (application.feed_url && !isHttpsUrl(application.feed_url)) {
    return NextResponse.json({ error: 'The feed URL must start with https://' }, { status: 400 });
  }
  if (application.website_url && !isHttpsUrl(application.website_url)) {
    application.website_url = isHttpsUrl(`https://${application.website_url}`) ? `https://${application.website_url}` : '';
  }

  let imported: ImportResult = { valid: [], rejected: [] };
  const file = form.get('inventory');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'The inventory file is larger than 2 MB.' }, { status: 400 });
    const { rates } = await getRates();
    imported = importFromFile(file.name, await file.text(), {
      defaultVertical: isVertical(vertical) ? vertical : null,
      rates,
      maxRows: 200,
    });
  }

  const supabase = (await createServerSupabase()) ?? getPublicClient();
  if (!supabase) return NextResponse.json({ error: 'Applications are not connected yet. Please email us instead.' }, { status: 503 });

  const { data, error } = await supabase.rpc('submit_dealer_application', {
    p_application: application,
    p_listings: imported.valid,
  });
  if (error || !data) {
    console.error(`[dealers/apply] ${error?.message ?? 'no data'}`);
    return NextResponse.json({ error: 'We could not submit your application. Please check the details and try again.' }, { status: 500 });
  }
  const result = data as { dealer_id: string; slug: string; listings_received: number };

  after(() => sendEmail(dealerApplicationEmail(application, result.listings_received, imported.rejected.length)));

  return NextResponse.json({
    slug: result.slug,
    listings_received: result.listings_received,
    rejected: imported.rejected.slice(0, 25),
    rejected_total: imported.rejected.length,
  });
}
