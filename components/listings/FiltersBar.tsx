'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { PRICE_BANDS, SALE_MODES } from '@/lib/constants';

export interface FilterValues {
  q: string;
  band: string;
  mode: string;
  sort: string;
}

/** Keyword, price, sale-mode and sort controls. State lives in the URL so results can be shared. */
export function FiltersBar({ basePath, initial }: { basePath: string; initial: FilterValues }) {
  const router = useRouter();
  const { t } = usePreferences();
  const [values, setValues] = useState<FilterValues>(initial);

  const apply = (next: FilterValues) => {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    const band = PRICE_BANDS[Number(next.band)];
    if (next.band !== '' && band) {
      if (band.min) params.set('min', String(band.min));
      if (band.max) params.set('max', String(band.max));
    }
    if (next.mode) params.set('mode', next.mode);
    if (next.sort && next.sort !== 'recommended') params.set('sort', next.sort);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  };

  const update = (patch: Partial<FilterValues>, submit: boolean) => {
    const next = { ...values, ...patch };
    setValues(next);
    if (submit) apply(next);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    apply(values);
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3 border border-sand bg-white p-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
        <input
          type="search"
          aria-label={t('bar.keyword')}
          placeholder={t('bar.keyword_placeholder')}
          value={values.q}
          onChange={(event) => update({ q: event.target.value }, false)}
          className="input ps-10"
        />
      </div>
      <select aria-label={t('bar.price')} value={values.band} onChange={(event) => update({ band: event.target.value }, true)} className="input">
        <option value="">{t('bar.any_price')}</option>
        {PRICE_BANDS.map((band, index) => (
          <option key={band.label} value={index}>
            {band.label}
          </option>
        ))}
      </select>
      <select aria-label="How it is sold" value={values.mode} onChange={(event) => update({ mode: event.target.value }, true)} className="input">
        <option value="">Any way to buy</option>
        {SALE_MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
      <select aria-label="Sort" value={values.sort} onChange={(event) => update({ sort: event.target.value }, true)} className="input">
        <option value="recommended">Recommended</option>
        <option value="newest">Newest first</option>
        <option value="price_desc">Price: high to low</option>
        <option value="price_asc">Price: low to high</option>
      </select>
      <button type="submit" className="btn btn-dark">
        {t('bar.search')}
      </button>
    </form>
  );
}
