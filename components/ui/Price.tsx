'use client';

import { usePreferences } from '@/components/providers/PreferencesProvider';

/** A USD amount shown in the visitor's currency at the live rate. Null means "price on request". */
export function Price({ usd, compact = false, className }: { usd: number | null | undefined; compact?: boolean; className?: string }) {
  const { price, t } = usePreferences();
  if (usd === null || usd === undefined) return <span className={className}>{t('card.poa')}</span>;
  return <span className={className}>{price(usd, compact)}</span>;
}
