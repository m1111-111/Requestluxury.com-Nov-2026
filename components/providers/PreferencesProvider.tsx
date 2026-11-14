'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CurrencyCode, LanguageCode, Rates } from '@/types';
import { LANGUAGES, isCurrency } from '@/lib/constants';
import { formatFromUsd } from '@/lib/format';
import { isLanguage, translate, type TranslationKey } from '@/lib/i18n';

interface Preferences {
  language: LanguageCode;
  currency: CurrencyCode;
  rates: Rates;
  setLanguage: (language: LanguageCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  /** Translate an interface string. */
  t: (key: TranslationKey) => string;
  /** Convert a USD amount to the visitor's currency and format it. */
  price: (amountUsd: number, compact?: boolean) => string;
}

const PreferencesContext = createContext<Preferences | null>(null);

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing: the choice simply lasts for this visit.
  }
}

export function PreferencesProvider({ rates, children }: { rates: Rates; children: ReactNode }) {
  // Pages are rendered once for everyone in English and USD; a returning visitor's
  // language and currency are restored as soon as the page loads.
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');

  useEffect(() => {
    const storedLanguage = readStored('rl_lang');
    const browserLanguage = (navigator.language || 'en').slice(0, 2).toLowerCase();
    const nextLanguage = isLanguage(storedLanguage) ? storedLanguage : isLanguage(browserLanguage) ? browserLanguage : 'en';
    const storedCurrency = readStored('rl_ccy') ?? readCookie('rl_ccy');
    const nextCurrency = isCurrency(storedCurrency) ? storedCurrency : 'USD';
    setLanguageState(nextLanguage);
    setCurrencyState(nextCurrency);
  }, []);

  useEffect(() => {
    const info = LANGUAGES.find((item) => item.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = info?.dir ?? 'ltr';
  }, [language]);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    writeStored('rl_lang', next);
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    writeStored('rl_ccy', next);
    document.cookie = `rl_ccy=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<Preferences>(
    () => ({
      language,
      currency,
      rates,
      setLanguage,
      setCurrency,
      t: (key) => translate(language, key),
      price: (amountUsd, compact = false) => formatFromUsd(amountUsd, currency, rates, compact),
    }),
    [language, currency, rates, setLanguage, setCurrency],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return context;
}
