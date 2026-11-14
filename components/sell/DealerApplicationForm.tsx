'use client';

import { useState, type FormEvent } from 'react';
import { CircleCheck, Upload } from 'lucide-react';
import { VERTICALS } from '@/lib/constants';

interface ApplyResult {
  slug: string;
  listings_received: number;
  rejected: Array<{ row: number; title: string; reason: string }>;
  rejected_total: number;
}

/** Self-serve Founding Partner application with an optional CSV / XML inventory upload. */
export function DealerApplicationForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [fileName, setFileName] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/dealers/apply', { method: 'POST', body: new FormData(event.currentTarget) });
      const body = (await response.json().catch(() => ({}))) as Partial<ApplyResult> & { error?: string };
      if (!response.ok || !body.slug) {
        setError(body.error || 'We could not submit your application. Please try again.');
        return;
      }
      setResult({ slug: body.slug, listings_received: body.listings_received ?? 0, rejected: body.rejected ?? [], rejected_total: body.rejected_total ?? 0 });
    } catch {
      setError('We could not submit your application. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div role="status" className="border border-gold/50 bg-white p-8">
        <CircleCheck aria-hidden="true" className="h-9 w-9 text-gold-deep" strokeWidth={1.25} />
        <h3 className="mt-4 font-serif text-3xl text-obsidian">Application received</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-charcoal">
          Thank you. Our partnerships team reviews every application and will reply within two business days.
          {result.listings_received > 0 && (
            <>
              {' '}
              <strong className="font-semibold">{result.listings_received}</strong> {result.listings_received === 1 ? 'listing was' : 'listings were'} received and
              placed in the moderation queue.
            </>
          )}
        </p>
        {result.rejected_total > 0 && (
          <div className="mt-6">
            <p className="label">
              {result.rejected_total} {result.rejected_total === 1 ? 'row was' : 'rows were'} not imported
            </p>
            <div className="max-h-64 overflow-auto border border-sand">
              <table className="table-rl">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Title</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rejected.map((row) => (
                    <tr key={`${row.row}-${row.title}`}>
                      <td>{row.row}</td>
                      <td>{row.title}</td>
                      <td>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-stone">Correct these rows and send them to the concierge desk, or upload them from your dealer portal once approved.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 border border-sand bg-white p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="da-company">
            Company name
          </label>
          <input id="da-company" name="company_name" required minLength={2} maxLength={160} autoComplete="organization" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-vertical">
            Main category
          </label>
          <select id="da-vertical" name="vertical_focus" required defaultValue="" className="input">
            <option value="" disabled>
              Select…
            </option>
            {VERTICALS.map((vertical) => (
              <option key={vertical.slug} value={vertical.slug}>
                {vertical.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="da-contact">
            Your name
          </label>
          <input id="da-contact" name="contact_name" required maxLength={160} autoComplete="name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-email">
            Work email
          </label>
          <input id="da-email" name="contact_email" type="email" required maxLength={320} autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-whatsapp">
            WhatsApp number (with country code)
          </label>
          <input id="da-whatsapp" name="whatsapp_number" type="tel" maxLength={40} placeholder="+971 50 000 0000" autoComplete="tel" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-site">
            Website
          </label>
          <input id="da-site" name="website_url" maxLength={300} placeholder="https://" autoComplete="url" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-city">
            City
          </label>
          <input id="da-city" name="city" required maxLength={120} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-country">
            Country
          </label>
          <input id="da-country" name="country" required maxLength={120} autoComplete="country-name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-orn">
            RERA ORN (Dubai brokerages)
          </label>
          <input id="da-orn" name="rera_orn_number" maxLength={60} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="da-feed">
            XML feed URL (optional)
          </label>
          <input id="da-feed" name="feed_url" type="url" maxLength={500} placeholder="https://yourdomain.com/feed.xml" className="input" />
        </div>
      </div>

      <div>
        <span className="label">Inventory file (optional): CSV or XML, up to 200 listings</span>
        <label className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-gold/60 bg-ivory px-6 py-8 text-center transition-colors hover:bg-white">
          <Upload aria-hidden="true" className="h-6 w-6 text-gold-deep" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-obsidian">{fileName || 'Choose a file'}</span>
          <span className="text-xs text-stone">Every listing is reviewed by our moderators before it is published.</span>
          <input
            type="file"
            name="inventory"
            accept=".csv,.xml,text/csv,application/xml,text/xml"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
          />
        </label>
        <p className="mt-2 text-xs text-stone">
          Start from our{' '}
          <a href="/samples/listings-template.csv" download className="text-gold-deep underline underline-offset-2">
            CSV template
          </a>{' '}
          or{' '}
          <a href="/samples/dealer-feed-example.xml" download className="text-gold-deep underline underline-offset-2">
            XML example
          </a>
          .
        </p>
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-dark md:justify-self-start">
        {busy ? 'Submitting…' : 'Apply as a Founding Partner'}
      </button>
    </form>
  );
}
