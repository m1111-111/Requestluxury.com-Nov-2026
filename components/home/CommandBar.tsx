'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, CircleCheck, Gem, Plane, Search, Ship } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { AFFILIATES } from '@/lib/concierge';
import { PRICE_BANDS, VERTICALS } from '@/lib/constants';
import { recallContact, rememberContact } from '@/lib/contact-memory';
import type { TranslationKey } from '@/lib/i18n';
import type { LeadReceipt } from '@/types';

type Tab = 'acquire' | 'charter' | 'sourcing';

async function postLead(payload: Record<string, unknown>): Promise<{ receipt?: LeadReceipt; error?: string }> {
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as { receipt?: LeadReceipt; error?: string };
    return response.ok ? body : { error: body.error };
  } catch {
    return {};
  }
}

/** NetJets-style command bar: acquire an asset, charter a jet or yacht, or brief the sourcing desk. */
export function CommandBar() {
  const { t } = usePreferences();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('acquire');

  // Tab 1: acquire
  const [vertical, setVertical] = useState('');
  const [keyword, setKeyword] = useState('');
  const [band, setBand] = useState('');

  // Tab 2: charter
  const [mode, setMode] = useState<'jet' | 'yacht'>('jet');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('');
  const [charterStep, setCharterStep] = useState<1 | 2>(1);

  // Tab 3: sourcing
  const [brief, setBrief] = useState('');

  // Shared contact + submission state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipts, setReceipts] = useState<Partial<Record<Tab, LeadReceipt>>>({});

  useEffect(() => {
    const remembered = recallContact();
    if (remembered) {
      setName(remembered.name);
      setEmail(remembered.email);
    }
  }, []);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    const selected = PRICE_BANDS[Number(band)];
    if (band !== '' && selected) {
      if (selected.min) params.set('min', String(selected.min));
      if (selected.max) params.set('max', String(selected.max));
    }
    const query = params.toString();
    const path = vertical ? `/${vertical}` : '/search';
    router.push(query ? `${path}?${query}` : path);
  };

  const submit = async (which: Tab, payload: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    const result = await postLead({ ...payload, name, email });
    setBusy(false);
    if (!result.receipt) {
      setError(result.error || t('form.error'));
      return;
    }
    rememberContact({ name, email, phone: recallContact()?.phone ?? '' });
    setReceipts((current) => ({ ...current, [which]: result.receipt }));
  };

  const onCharter = (event: FormEvent) => {
    event.preventDefault();
    if (charterStep === 1) {
      setCharterStep(2);
      return;
    }
    void submit('charter', {
      lead_type: 'charter_request',
      message: `${mode === 'jet' ? 'Private jet' : 'Yacht'} charter: ${origin} to ${destination}${date ? ` on ${date}` : ''}${guests ? `, ${guests} guests` : ''}.`,
      metadata: { service: mode === 'jet' ? 'private-jet-charter' : 'yacht-charter', origin, destination, travel_date: date, passengers: guests, source: 'command-bar' },
    });
  };

  const onSourcing = (event: FormEvent) => {
    event.preventDefault();
    void submit('sourcing', {
      lead_type: 'bespoke_sourcing',
      message: brief,
      metadata: { service: 'asset-sourcing', source: 'command-bar' },
    });
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof Search }> = [
    { id: 'acquire', label: t('bar.acquire'), icon: Gem },
    { id: 'charter', label: t('bar.charter'), icon: Plane },
    { id: 'sourcing', label: t('bar.sourcing'), icon: Search },
  ];

  const confirmation = (receipt: LeadReceipt, onward?: { label: string; href: string }) => (
    <div role="status" className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
      <p className="flex items-center gap-3 text-[15px] text-charcoal">
        <CircleCheck aria-hidden="true" className="h-6 w-6 shrink-0 text-gold-deep" />
        <span>
          {t('form.thanks')} <strong className="font-semibold">{receipt.reference}</strong>
        </span>
      </p>
      {onward && (
        <a href={onward.href} target="_blank" rel="sponsored noopener noreferrer" className="btn btn-dark">
          {onward.label}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </a>
      )}
    </div>
  );

  const contactFields = (
    <>
      <div>
        <label className="label" htmlFor="cb-name">
          {t('form.name')}
        </label>
        <input id="cb-name" required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="cb-email">
          {t('form.email')}
        </label>
        <input id="cb-email" type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" />
      </div>
    </>
  );

  return (
    <div className="bg-white text-charcoal shadow-float">
      <div role="tablist" aria-label="What would you like to do?" className="flex overflow-x-auto border-b border-sand scrollbar-none">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`cb-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`cb-panel-${id}`}
            onClick={() => {
              setTab(id);
              setError('');
            }}
            className={`flex shrink-0 items-center gap-2.5 border-b-2 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors md:px-7 ${
              tab === id ? 'border-gold text-obsidian' : 'border-transparent text-stone hover:text-obsidian'
            }`}
          >
            <Icon aria-hidden="true" className={`h-4 w-4 ${tab === id ? 'text-gold-deep' : ''}`} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'acquire' && (
        <form id="cb-panel-acquire" role="tabpanel" aria-labelledby="cb-tab-acquire" onSubmit={onSearch} className="grid gap-4 p-5 md:grid-cols-[1fr_1.4fr_1fr_auto] md:items-end">
          <div>
            <label className="label" htmlFor="cb-vertical">
              {t('bar.category')}
            </label>
            <select id="cb-vertical" value={vertical} onChange={(event) => setVertical(event.target.value)} className="input">
              <option value="">{t('bar.all')}</option>
              {VERTICALS.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {t(`nav.${item.slug}` as TranslationKey)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cb-keyword">
              {t('bar.keyword')}
            </label>
            <input id="cb-keyword" type="search" maxLength={80} placeholder={t('bar.keyword_placeholder')} value={keyword} onChange={(event) => setKeyword(event.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cb-price">
              {t('bar.price')}
            </label>
            <select id="cb-price" value={band} onChange={(event) => setBand(event.target.value)} className="input">
              <option value="">{t('bar.any_price')}</option>
              {PRICE_BANDS.map((item, index) => (
                <option key={item.label} value={index}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-dark">
            <Search aria-hidden="true" className="h-4 w-4" />
            {t('bar.search')}
          </button>
        </form>
      )}

      {tab === 'charter' && (
        <div id="cb-panel-charter" role="tabpanel" aria-labelledby="cb-tab-charter">
          {receipts.charter ? (
            confirmation(
              receipts.charter,
              mode === 'jet'
                ? { label: 'Continue to Villiers Jets', href: AFFILIATES.villiersJets }
                : AFFILIATES.yachtCharter
                  ? { label: 'Continue to our yacht charter partner', href: AFFILIATES.yachtCharter }
                  : undefined,
            )
          ) : (
            <form onSubmit={onCharter} className="grid gap-4 p-5">
              <div className="grid gap-4 md:grid-cols-[auto_1.2fr_1.2fr_1fr_0.7fr_auto] md:items-end">
                <div role="radiogroup" aria-label="Charter type" className="flex h-12 border border-sand">
                  {(['jet', 'yacht'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={mode === option}
                      onClick={() => setMode(option)}
                      className={`flex flex-1 items-center justify-center gap-2 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        mode === option ? 'bg-obsidian text-gold' : 'bg-white text-stone hover:text-obsidian'
                      }`}
                    >
                      {option === 'jet' ? <Plane aria-hidden="true" className="h-4 w-4" /> : <Ship aria-hidden="true" className="h-4 w-4" />}
                      {option === 'jet' ? t('bar.jet') : t('bar.yacht')}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label" htmlFor="cb-origin">
                    {t('bar.from')}
                  </label>
                  <input id="cb-origin" required maxLength={120} placeholder={mode === 'jet' ? 'London' : 'Monaco'} value={origin} onChange={(event) => setOrigin(event.target.value)} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="cb-destination">
                    {t('bar.to')}
                  </label>
                  <input id="cb-destination" required maxLength={120} placeholder={mode === 'jet' ? 'Dubai' : 'Portofino'} value={destination} onChange={(event) => setDestination(event.target.value)} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="cb-date">
                    {t('bar.date')}
                  </label>
                  <input id="cb-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="cb-guests">
                    {t('bar.pax')}
                  </label>
                  <input id="cb-guests" inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} placeholder="4" value={guests} onChange={(event) => setGuests(event.target.value)} className="input" />
                </div>
                {charterStep === 1 && (
                  <button type="submit" className="btn btn-dark">
                    {t('bar.quote')}
                  </button>
                )}
              </div>
              {charterStep === 2 && (
                <div className="grid animate-fade-up gap-4 border-t border-sand pt-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  {contactFields}
                  <button type="submit" disabled={busy} className="btn btn-dark">
                    {busy ? t('form.sending') : t('bar.quote')}
                  </button>
                </div>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {tab === 'sourcing' && (
        <div id="cb-panel-sourcing" role="tabpanel" aria-labelledby="cb-tab-sourcing">
          {receipts.sourcing ? (
            confirmation(receipts.sourcing)
          ) : (
            <form onSubmit={onSourcing} className="grid gap-4 p-5 md:grid-cols-[1.8fr_1fr_1fr_auto] md:items-end">
              <div>
                <label className="label" htmlFor="cb-brief">
                  {t('bar.sourcing_prompt')}
                </label>
                <input id="cb-brief" required minLength={10} maxLength={1000} placeholder={t('bar.sourcing_placeholder')} value={brief} onChange={(event) => setBrief(event.target.value)} className="input" />
              </div>
              {contactFields}
              <button type="submit" disabled={busy} className="btn btn-dark">
                {busy ? t('form.sending') : t('bar.send_brief')}
              </button>
              {error && (
                <p role="alert" className="text-sm text-red-700 md:col-span-4">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
