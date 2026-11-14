'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { CURRENCIES, LANGUAGES } from '@/lib/constants';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import type { CurrencyCode, LanguageCode } from '@/types';

export function TopBar() {
  const { language, currency, setLanguage, setCurrency, t } = usePreferences();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const selectClass =
    'cursor-pointer appearance-none bg-transparent py-1 pe-1 text-[11px] font-semibold tracking-[0.14em] text-white/85 hover:text-gold focus:text-gold focus:outline-none';

  return (
    <div className="no-print bg-obsidian text-white">
      <div className="container-rl flex h-10 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Globe aria-hidden="true" className="h-3.5 w-3.5 text-gold" />
          <label className="sr-only" htmlFor="rl-language">
            {t('nav.language')}
          </label>
          <select
            id="rl-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            className={selectClass}
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code} className="text-charcoal">
                {item.label} · {item.native}
              </option>
            ))}
          </select>
          <span aria-hidden="true" className="h-3 w-px bg-white/20" />
          <label className="sr-only" htmlFor="rl-currency">
            {t('nav.currency')}
          </label>
          <select
            id="rl-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
            className={selectClass}
          >
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code} className="text-charcoal">
                {item.code}
              </option>
            ))}
          </select>
        </div>
        <nav aria-label="Account" className="flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.16em]">
          <Link href="/sell-with-us" className="text-gold hover:text-gold-light">
            {t('nav.sell')}
          </Link>
          <Link href={signedIn ? '/account' : '/sign-in'} className="text-white/85 hover:text-gold">
            {signedIn ? t('nav.account') : t('nav.sign_in')}
          </Link>
        </nav>
      </div>
    </div>
  );
}
