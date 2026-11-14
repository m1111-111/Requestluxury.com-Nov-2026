'use client';

import { usePreferences } from '@/components/providers/PreferencesProvider';
import type { TranslationKey } from '@/lib/i18n';

/** Renders an interface string in the visitor's language. Usable inside Server Components. */
export function T({ k }: { k: TranslationKey }) {
  const { t } = usePreferences();
  return <>{t(k)}</>;
}
