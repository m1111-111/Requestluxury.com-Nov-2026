'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FileText, Lock, LockOpen, ShieldCheck } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { recallContact, rememberContact } from '@/lib/contact-memory';
import type { DealRoomDoc, DealRoomTeaser } from '@/types';

interface Unlocked {
  reference: string;
  verified: boolean;
  documents: DealRoomDoc[];
  exact_address: string | null;
}

const KIND_LABELS: Record<string, string> = {
  floorplan: 'Floor plans',
  specification: 'Specification',
  provenance: 'Provenance',
  inspection: 'Inspection report',
  certificate: 'Certificate',
  valuation: 'Valuation',
  legal: 'Legal & title',
  document: 'Document',
};

/** Only same-site paths and https links are ever rendered as document links. */
function safeDocumentUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Gated deal room. Visitors see the titles of the documents behind a blurred card;
 * entering contact details registers a protected lead and releases the documents
 * marked "registered". Documents marked "verified" are released to verified buyers.
 */
export function DealRoom({ listingId, preview }: { listingId: string; preview: DealRoomTeaser[] }) {
  const { t } = usePreferences();
  const [unlocked, setUnlocked] = useState<Unlocked | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const storageKey = `rl_dealroom:${listingId}`;

  useEffect(() => {
    try {
      const cached = window.sessionStorage.getItem(storageKey);
      if (cached) setUnlocked(JSON.parse(cached) as Unlocked);
    } catch {
      // Nothing cached.
    }
    const remembered = recallContact();
    if (remembered) {
      setName(remembered.name);
      setEmail(remembered.email);
      setPhone(remembered.phone);
    }
  }, [storageKey]);

  if (preview.length === 0) return null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/deal-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, name, email, phone }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Unlocked> & { error?: string };
      if (!response.ok || !body.reference || !Array.isArray(body.documents)) {
        setError(body.error || t('form.error'));
        return;
      }
      const result: Unlocked = {
        reference: body.reference,
        verified: Boolean(body.verified),
        documents: body.documents,
        exact_address: body.exact_address ?? null,
      };
      rememberContact({ name, email, phone });
      setUnlocked(result);
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(result));
      } catch {
        // Session storage unavailable.
      }
    } catch {
      setError(t('form.error'));
    } finally {
      setBusy(false);
    }
  };

  const documents: Array<DealRoomTeaser & { url?: string | null }> = unlocked ? unlocked.documents : preview;

  return (
    <section aria-labelledby="deal-room-title" className="border border-sand bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand px-6 py-5">
        <div>
          <p className="eyebrow">{unlocked ? `Unlocked · ${unlocked.reference}` : `${preview.length} confidential ${preview.length === 1 ? 'document' : 'documents'}`}</p>
          <h2 id="deal-room-title" className="mt-1 font-serif text-3xl text-obsidian">
            {t('detail.deal_room')}
          </h2>
        </div>
        {unlocked ? <LockOpen aria-hidden="true" className="h-6 w-6 text-gold-deep" /> : <Lock aria-hidden="true" className="h-6 w-6 text-gold-deep" />}
      </div>

      <ul className="grid gap-px bg-sand sm:grid-cols-2">
        {documents.map((document, index) => {
          const url = unlocked ? safeDocumentUrl(document.url ?? null) : null;
          const awaitingVerification = Boolean(unlocked) && !url;
          return (
            <li key={`${document.title}-${index}`} className="relative bg-white p-5">
              <div className={`flex gap-4 ${unlocked ? '' : 'select-none'}`}>
                <div className={`flex h-20 w-16 shrink-0 items-center justify-center border border-sand bg-ivory ${unlocked ? '' : 'blur-[3px]'}`}>
                  <FileText aria-hidden="true" className="h-7 w-7 text-gold-deep" strokeWidth={1.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone">{KIND_LABELS[document.kind] ?? 'Document'}</p>
                  <p className="mt-1 font-serif text-xl leading-snug text-obsidian">{document.title}</p>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep underline underline-offset-4">
                      Open document
                    </a>
                  ) : awaitingVerification ? (
                    <p className="mt-2 text-xs leading-relaxed text-stone">Released to verified buyers. Our concierge will contact you to complete verification.</p>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-stone">
                      <Lock aria-hidden="true" className="h-3 w-3" />
                      {document.access === 'verified' ? 'Verified buyers' : 'Unlocks with your details'}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {unlocked?.exact_address && (
        <p className="border-t border-sand px-6 py-4 text-sm text-charcoal">
          <span className="label mb-1">Exact address</span>
          {unlocked.exact_address}
        </p>
      )}

      {!unlocked && (
        <form onSubmit={onSubmit} className="grid gap-4 border-t border-sand bg-ivory p-6">
          <p className="text-sm leading-relaxed text-charcoal">
            Enter your details to open the deal room. Your request is registered under a private reference and shared only with the specialist for this asset.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="dr-name">
                {t('form.name')}
              </label>
              <input id="dr-name" required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dr-email">
                {t('form.email')}
              </label>
              <input id="dr-email" type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dr-phone">
                {t('form.phone')}
              </label>
              <input id="dr-phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="input" />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy} className="btn btn-dark">
              <LockOpen aria-hidden="true" className="h-4 w-4" />
              {busy ? t('form.sending') : t('detail.unlock')}
            </button>
            <p className="flex items-center gap-2 text-xs text-stone">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-gold-deep" />
              {t('detail.protected')}
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
